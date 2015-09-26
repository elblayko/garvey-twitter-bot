var Twitter = require('twitter');

//////////////////////////////////////////////////////////////////////////////////////////////////
// Application configuration.

require('./env.js');

var client = new Twitter({
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token_key: process.env.access_token_key,
    access_token_secret: process.env.access_token_secret
});

var searchString    = "goin to the club OR key and peele club";
var replyString     = "Ain't none y'all old enough to go to the damn club!";

/**
 *  @name           loop()
 *  @description    Makes an request to the Twitter API searching for tweets that match our search
 *                  criteria.  Send a reply to that user.
 */

var loop = function() {

    // Just output the current time the request was ran at.
    console.log(new Date());

    // Search for tweets.
    client.get('/search/tweets', {q: searchString, count: 150}, function(error, tweets, response) {
        if (error) { 
            console.log('An error occured getting tweets. ' + error);
            return;
        }

        tweets.statuses.forEach(function(tweet) {

            // Don't reply to retweets.
            if (tweet.retweeted_status == undefined) {

                // Post a reply to that user.
                client.post('/statuses/update', {
                    status: '@' + tweet.user.screen_name + " " + replyString,
                    in_reply_to_status_id: tweet.id_str
                },

                // Handle errors.
                function(error, tweet, response) {
                    if (error) { 
                        console.log(error);
                        return;
                    }
                    
                    console.log('Replied to ' + tweet.id_str);
                });
            }
        });
    });
};


//////////////////////////////////////////////////////////////////////////////////////////////////
// Main logic.

loop();
setInterval(loop, 900000);  // 15 minutes.