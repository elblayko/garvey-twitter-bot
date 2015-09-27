var Twitter = require('twitter');
var mongoose = require('mongoose');

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
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token_key: process.env.access_token_key,
    access_token_secret: process.env.access_token_secret
});

global.searchString    = "goin to the club";
global.replyString     = "Ain't none y'all old enough to go to the damn club!";

/**
 *  @name           loop()
 *  @description    Makes an request to the Twitter API searching for tweets that match our search
 *                  criteria.  Send a reply to that user.
 */

var loop = function() {

	console.log('\n' + new Date() + ' Searching for tweets...');

	// Search for Tweets.
    client.get('search/tweets', {q: global.searchString, count: 3, result_type: 'recent'}, function (error, tweets, response) {

        if (error) {
            console.log('An error occured getting tweets. ' + error);
            return;
        }

        if (tweets.length == 0) {
        	console.log('No tweets found with search query.');
        	return;
        }

        // We have tweets, let's make some replies.
        tweets.statuses.forEach(function(tweet) {

            // Don't reply to retweets.
            if (tweet.retweeted_status == undefined) {

            	// Have we already tweeted to this user?
            	User.find({handle: tweet.user.screen_name}, function(error, data) {
            		if (error) {
            			console.log('Unable to connect to database.');
            			return;
            		}

            		if (typeof data === 'object') {
            			console.log('Already tweeted to user.');
            			return;
            		}
            	});

            	// Create a new user, we don't want to tweet to them again in the future.
            	var newUser = User({
            		handle: tweet.user.screen_name,
            		created_at: new Date()
            	});

            	newUser.save(function(error) {
            		if (error) {
            			console.log('Could not save user to database.');
            			return;
            		}
            	});

                // Post a reply to that user.
                client.post('statuses/update', {
                    status: '@' + tweet.user.screen_name + " " + global.replyString,
                    in_reply_to_status_id: tweet.id_str
                },

                function(error, tweet, response) {
                    if (error) {
                        console.log("Can't post tweet because of an error. " + error);
                        return;
                    }

                    console.log('Tweeted to user with no errors.');
                });
            }
        });
    });
};


//////////////////////////////////////////////////////////////////////////////////////////////////
// Main logic.

loop();
setInterval(loop, 900000);  // 15 minutes.