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

/**
 *  @name           getTweets
 *  @description    Retrieves posts from the Twitter API relevant to our search query.
 *  @returns        Promise
 */

var getTweets = function() {

    var deferred = q.defer();

    // Search settings.
    client.get('search/tweets', {
        q: global.searchString,
        count: 10,
        result_type: 'recent'
    },

    function(error, tweets, response) {

        // Some error occured.
        if (error) {
            return deferred.reject(error);
        }

        // No relevant tweets found.
        if (tweets.length == 0) {
            return deferred.reject('No tweets found relevant to search query.');
        }

        // All good.
        deferred.resolve(tweets);
        console.log(new Date() + '\nFetched ' + tweets.statuses.length + ' tweets.');
    });

    return deferred.promise;
 };

/**
 *  @name           writeTweet
 *  @param          tweet - Tweet object
 *  @description    Posts a tweet to Twitter in response to a user's post.
 *  @returns        True if successful, false if an error occured.
 */

var writeTweet = function(tweet) {

    // Is this tweet a retweet?
    if (tweet.retweeted_status != undefined) {
        return false;
    }

    // Have we tweeted to this user already?
    User.find({handle: tweet.user.screen_name}, function(error, data) {
        if (error) {            
            return false;
        }

        if (data.length > 0) {
            return false;
        }
    });

    // New user definition.
    var newUser = User({
        handle: tweet.user.screen_name,
        created_at: new Date()
    });

    // Post a tweet to the user.
    client.post('statuses/update', {
        status: '@' + tweet.user.screen_name + " " + global.replyString,
        in_reply_to_status_id: tweet.id_str
    },

    function (error, tw, response) {
        if (error) {
            if (error.code == 187) { // Already tweeted to user, didn't get them in the database before.
                newUser.save(function(error) {
                    if (error) {
                        console.error('Error writing user to database.');
                    }
                });
            }
            else {
                console.error('Error occured writing tweet: ' + error.message);
            }
            return false;
        }
    });

    // Create a new user, we won't bother them again.
    newUser.save(function(error) {
        if (error) {
            console.error('Error writing user to database.');
            return false;
        }
    });

    console.log('Tweeted to ' + tweet.user.screen_name);
    return true;
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// Main logic.

getTweets().then(function(tweets) {

    var tweets = tweets.statuses;
    var currentTweetIndex = 0;

    // Execute every three minutes.
    setInterval(function() {

        // Check that we haven't ran out of tweets.
        // If we have, reset the index and get more.       
        if (currentTweetIndex == tweets.length - 1 || currentTweetIndex > 5) {
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

    }, 180000); // 3 minutes.

}, console.log);
