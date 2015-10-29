var _ = require("lodash");
var jsdom = require("jsdom");
var Q = require("q");
var request = require("request");

var endpoint = function(listId, page) {
    return "http://www.ranker.com/list/loadmore.htm?page=" +
           page +
           "&format=GRID&defaultpropid=0&listId=" +
           listId +
           "&inlineAdLoaded=false&instart_disable_injection=true";
};

var html = [];
var movies = [];

var fetch_loop = function(condition, body) {
    var deferred = Q.defer();
    function loop() {
        if (!condition()) return deferred.resolve();
        Q.when(body(), loop, deferred.reject);
    }
    Q.nextTick(loop);
    return deferred.promise;
};

var collect_movies = function(dom) {
    var deferred = Q.defer();
    jsdom.env({
        html: dom.join(),
        scripts: "https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js",
        done: function(errors, window) {
            var $ = window.$;
            $("body > li").each(function (index, el) {
                var obj = {};
                obj.rank = parseInt($(el).find(".rank span").text().trim(), 10);
                obj.upvotes = parseInt($(el).find(".numVote.up").text().trim(), 10);
                obj.downvotes = parseInt($(el).find(".numVote.down").text().trim(), 10);
                obj.title = $(el).find(".name a").text().trim();
                movies.push(obj);
            });
            deferred.resolve();
        }
    });
    return deferred.promise;
};

var move_articles = function(title) {
    title = title.toLowerCase();

    if (title.startsWith('a ')) {
        title = title.substring(2) + ' (a)';
    }

    if (title.startsWith('an ')) {
        title = title.substring(3) + ' (an)';
    }

    if (title.startsWith('the ')) {
        title = title.substring(4) + ' (the)';
    }

    return title;
};

var process_movies = function() {
    var deferred = Q.defer();

    _.each(movies, function (movie, i, list) {
        if (_.isUndefined(movie) ||
            !movie["rank"] ||
            isNaN(movie.rank) ||
            movie.title.length < 1) {
            list.splice(i, 1);
        } else {
            movies[i].title = move_articles(movie.title);
        }

        if(i == list.length - 1) {
            deferred.resolve();
        }
    });
    return deferred.promise;
};

var list_movies_by_char = function (char) {
    var list = _.pluck(_.filter(movies, function (movie) {
        return movie.title[0] == char;
    }), 'title').join(', ');

    return list;
};

var index = 1;

module.exports = {
    init: function() {
            fetch_loop(function () { return index <= 10; }, function () {
            request(endpoint(300127, index), function (error, response, body) {
              if (!error && response.statusCode == 200) {
                html.push(body);
              } else {
                console.log(error);
                console.log(response);
              }
            });

            index++;

            return Q.delay(500); // arbitrary async
        }).then(function() {
            return collect_movies(html).then(function() {
                return process_movies().then(function() {
                    console.log('finished initializing movies');
                });
            });
        }).done();
    },
    get: list_movies_by_char
};