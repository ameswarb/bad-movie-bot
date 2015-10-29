var config = require('./config.json');
var movies = require('./lib/movies.js');
var Slack = require('slack-client');

var bot = new Slack(config.token, config.autoReconnect, config.autoMark);
movies.init();

bot.on('open', function() {
    console.log("Connected to " + bot.team.name + " as " + bot.self.name);
});

bot.on('message', function(msg) {
    if (msg.text && msg.text.indexOf(bot.self.id) > -1) {
        var channel = bot.getChannelGroupOrDMByID(msg.channel);
        var letter = msg.text.substr(msg.text.length - 1);
        if( /[^a-zA-Z0-9]/.test(letter) ) {
           console.log('Error: Input is not alphanumeric');
           channel.send('Nice try, jerk.');
        } else {
            var response = movies.get(letter);
            if (response.length > 0) {
                channel.send(response);
            } else {
                channel.send("sorry, couldn't find any movies starting with " +
                             letter + " ¯\\\_(ツ)_/¯");
            }
        }
    }
});

bot.on('error', function(err) {
    console.error("Error", err);
});

bot.login();