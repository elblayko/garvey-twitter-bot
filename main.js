var Twitter     = require('twitter');
var mongoose    = require('mongoose');
var q           = require('q');

//////////////////////////////////////////////////////////////////////////////////////////////////
// Database configuration.

mongoose.connect('mongodb://localhost/twitter');

var db = mongoose.connection;

userSchema = mongoose.Schema({
    handle: String,
    created_at: String
});

var User = mongoose.model('User', userSchema);

//////////////////////////////////////////////////////////////////////////////////////////////////
// Twitter configuration.

require('./env.js');

var client = new Twitter({
    consumer_key:           process.env.consumer_key,
    consumer_secret:        process.env.consumer_secret,
    access_token_key:       process.env.access_token_key,
    access_token_secret:    process.env.access_token_secret
});

global.searchString    = "going to the club";
global.replyString     = "Ain't none y'all old enough to go to the damn club!";

var getTweets = function() {

    var deferred = q.defer();

    console.log(new Date() + ' Searching for tweets.');

    client.get('search/tweets', {
        q: global.searchString,
        count: 25,
        result_type: 'recent'
    }, 

    function(error, tweets, response) {
        if (error) {
            return deferred.reject(error);
        }

        if (tweets.length == 0) {
            return deferred.reject('No tweets found relevant to search query.');
        }

        deferred.resolve(tweets);
    });

    return deferred.promise;
 };

var writeTweet = function(tweet) {

    // Is this tweet a retweet?
    if (tweet.retweeted_status != undefined) {
        console.log('Tweet is a retweet.');
        return false;
    }

    // Have we tweeted to this user already?
    User.find({handle: tweet.user.screen_name}, function(error, data) {
        if (error) {            
            console.log('Already tweeted to user.');
            return false;
        }
    });

    // Create a new user, we won't bother them again.
    var newUser = User({
        handle: tweet.user.screen_name,
        created_at: new Date()
    });

    newUser.save(function(error) {
        if (error) {
            console.error('Error writing user to database.');
            return false;
        }
    });

    // Post a tweet to the user.
    client.post('statuses/update', {
        status: '@' + tweet.user.screen_name + " " + global.replyString,
        in_reply_to_status_id: tweet.id_str
    },

    function (error, tw, response) {
        if (error) {
            console.error('Error occured writing tweet: ' + tw.message);
            return;
        }

        global.currentTweetIndex++;
        console.log('Tweeted to ' + tweet.user.screen_name);
    });

    return true;
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// Main logic.

getTweets().then(function(tweets) {

    var tweets = tweets.statuses;
    var currentTweetIndex = 0;

    // Execute only once per minute.
    setInterval(function() {

        // Check that we haven't ran out of tweets.
        // If we have, reset the index and get more.       
        if (currentTweetIndex == tweets.length - 1) {
            getTweets().then(function(tw) {
                currentTweetIndex = 0;
                tweets = tw.statuses;
            }, console.log);
        }

        // Initialize the result of posting this tweet.
        var result = false;

        // Iterate over available tweets until we can get one that
        // we haven't posted to, and one that isn't a retweet.
        do {
            result = writeTweet(tweets[currentTweetIndex]);
            currentTweetIndex++;
        }
        while (result == false);

    }, 15000);

}, console.log);