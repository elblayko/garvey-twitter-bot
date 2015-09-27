var Twitter = require('twitter');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/twitter');

var db = mongoose.connection;

userSchema = mongoose.Schema({
	handle: String,
	created_at: String
});

var User = mongoose.model('User', userSchema);

//////////////////////////////////////////////////////////////////////////////////////////////////
// Application configuration.

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

	console.log(new Date() + ' Searching for tweets...');

    client.get('search/tweets', {q: global.searchString, count: 10, result_type: 'recent'}, function(error, tweets, response) {
        
        if (error) {
            console.log('An error occured getting tweets. ' + error);
            return;
        }

        if (tweets.length == 0) {
        	console.log('No tweets found with search query.');
        	return;
        }

        tweets.statuses.forEach(function(tweet) {

            // Don't reply to retweets.
            if (tweet.retweeted_status == undefined) {

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

            	// Create a user.  We don't want to Tweet to them again.
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

                // Handle errors.
                function(error, tweet, response) {
                    if (error) {
                        console.log("Can't post tweet because of an error. " + error);
                        return;
                    }

                    console.log('Replied to ' + tweet.user.screen_name + ' with no errors.');
                });
            }
        });
    });
};


//////////////////////////////////////////////////////////////////////////////////////////////////
// Main logic.

loop();
setInterval(loop, 900000);  // 15 minutes.