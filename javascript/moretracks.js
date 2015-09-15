/*
    Title:  More Tracks Like This JavaScript
    File. moretracks.js
    
    Site: http://moretrackslikethis.com/
    Src: http://github.com/hackday-people/moretrackslikethis.com
    
    Created: Sat 24 Jul 2010 17:31:35 BST 
    
 Copyright (c) 2010 Kenneth Kufluk, Jon Griffiths and Andrew Mason

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 
*/

/*
    Title:  Spotify Recommendation via Last.fm
*/

var moreTracksLikeThis = (function(){

    var MAX_TRACKS_TO_RETURN = 10;

    var spotifyEls = [];  // a map of spotify queries to result elements
    var spotifyCountdown = 0;  // a counter to kick off the results display when all results are in

    $(document).ready(function(){

        // search button
        $('#search').bind('click submit', function() {
            
            // spotify uri lookup if necessary
            if ($('#lookup').val()!='') {
                getSpotifyLookup($('#lookup').val());
                return false;
            }

            // validation
            if (!$('#artist').val() || !$('#track').val()) {
                $('#messages').html('<p>Please fill in both track name and artist.</p> ');
            }
            
            // Start the search
            $('#messages').empty();
            $('#messages').show();
            $('#messages').html('<p>Searching now...</p> ');
            
            $('#results').hide();
            
            
            setTimeout(function() {
                getLastFMSimilarData(formatSearchString($('#track').val()), formatSearchString($('#artist').val()));
            }, 1000);
            $('#complete').hide();
            $('#results').show();
            $('html,body').animate({scrollTop: $('#results').offset().top}, 900);
            
            try {
                _gaq.push(['_trackEvent', $('#artist').val(), $('#track').val()]);            
            } catch (e) {}
            return false;
        });
        
        // lookup button
        $('#lookup').bind('click submit', function() {
        });

        // just an example
        $('#example_track').bind('click', function(e) {
            $('#track').val('Hey');
            $('#artist').val('Pixies');
            $('#search').click();
            return false;
        });
        
        // select the text area contents if clicked, to make cutting+pasting easier
        $('#results-textarea').click(function() {
            this.select();
        });
        
        // hide the results box
        $('#complete').hide();
        
        // handle submit actions
        $('#searchForm').submit(function() {
            $('#search').click();
            return false;
        });
        
        // do the weird text-select-drag action
        var selectDraggerText = function() {
            var div;
            if (document.selection) {
                div = document.body.createTextRange();
                div.moveToElementText($("#dragger")[0]);
                div.select();
            } else {
                div = document.createRange();
                div.setStartBefore($("#dragger")[0]);
                div.setEndAfter($("#dragger")[0]) ;
                window.getSelection().addRange(div);
            }
        };
        $('#dragger').mouseover(selectDraggerText);
        $('#dragger').mousedown(function() {
            $(this).css({'opacity':'1'});
            $(this).animate({'opacity':'0'}, 1000);
        });
        $('#dragger').mouseleave(function() {
            $(this).css({'opacity':'0'});
        });
        
        // put the cursor in the track box to get started
        $('#track').select();
        
    });
    
    // prepare the lastfm url through yql
    var getLastFMSimilarURL = function(track, artist) {
        var track = encodeURIComponent(  $.trim(track)  );
        var artist = encodeURIComponent( $.trim(artist) );
        var url = 'http://ws.audioscrobbler.com/2.0/?method=track.getSimilar&autocorrect=1&api_key=f848f5efdbf20b9366985a24f7aed172&format=json&limit='+ MAX_TRACKS_TO_RETURN + '&';
        url += 'artist=' + artist + '&track=' + track;
        return url;
    };
    
    // look up the track and artist in lastfm's similar search
    var getLastFMSimilarData = function(track, artist) {
        return $.getJSON(getLastFMSimilarURL(track, artist), callbackLastFMData);
    };
    
    // process the data from lastfm
    var callbackLastFMData = function (data) {
        if (data && data.hasOwnProperty( 'similartracks' ) ) {
            $('#messages').empty();
            $('#messages').hide('slow');
            $('#complete').hide();
            
            $('#buildingMsg').text('Building playlist...');
            $('#buildingMsg').show('slow');
            
            $('#resultsList').empty();
            var $resultEl = $('#resultsList');
            $.each(data.similartracks.track, function(index, trackObj) {
                var artist = trackObj.artist.name || "artist";
                var track = trackObj.name || "track";

                var $rowEl = $('<li class="round"></li>');
                $rowEl.append($('<img src="'+trackObj.image[1]['#text'] + '"/><span class="overlay"></span>'));
                $rowEl.append('<strong>' + track + '</strong><br />');
                $rowEl.append('by <strong>' + artist + '</strong><br />');

                var $spotiLinkEl = $('<span class="link"></span>');
                $rowEl.append($spotiLinkEl);

                var $deleteEl = $('<a href="#" class="delete">Delete</a>');
                $deleteEl.click(function() {
                    $rowEl.remove();
                    spotifyComplete();
                    return false;
                });
                $rowEl.append($deleteEl);
                

                $resultEl.append($rowEl);
                spotifyTimeout = setTimeout(function() {
                    getSpotifyLinks($spotiLinkEl, artist, track);
                }, 500 * parseInt(index));
            });
            spotifyCountdown = data.similartracks.track.length;
        } else {
            $('#messages').html('<p>Sorry, there was no results for that search. Try something else.</p>');
        }
    };
    
    // Lookup tracks from Spotify metadata api
    var getSpotifyLinks = function($el, artist, track) {
        var spotifyurl = 'https://api.spotify.com/v1/search?limit=1&type=track&q=artist:'  + encodeURIComponent(artist) + '%20track:' + encodeURIComponent(track);
        $.getJSON(spotifyurl, function(data) {
            callbackSpotifyData(data, $el);
        });
    };
    
    // process the spotify result
    var callbackSpotifyData = function(data, $el) {
        spotifyCountdown--;
        var href = '';
        if (data.tracks.total > 0) {
            href = data.tracks.items[0].uri;
            $el.html('<a href="' + href + '">' + href + '</a>');
        } else {
            $el.html('<strong>Sorry, Spotify doesn&rsquo;t have that track</strong>');
        }

        if ( spotifyCountdown<1 ) spotifyComplete();
    };
    
    // process the spotify result
    var getSpotifyStr = function() {
        var str = '';
        $('.link a').each(function() {
            str += '\n' + this.href;
        });
        return str;
    };
    
    
    // when all results are in, display the 'complete' box
    var spotifyComplete = function() {
        swfobject.embedSWF(
            "clippy.swf", "clippy", 
            "110", "19", 
            '9.0.0',
            'javascript/swfobject/expressInstall.swf', 
            {text: getSpotifyStr()},
            {quality : "high", allowScriptAccess:"always", wmode:"transparent"},
            {id: "clippy", name: "clippy"}
            );

        $('#buildingMsg').hide('slow');

        $('#results-textarea').val(getSpotifyStr());
        var draggerContent = getSpotifyStr();
        $('#dragger').html(draggerContent);
        $('#complete').fadeIn('slow');

    };


    // Lookup spotify urls
    var getSpotifyLookup = function(lookupurl) {
        var regex = /[\d\w]{22}/;
        var match = regex.exec(lookupurl);

        if (!match) {
            return $('#messages').html('<p>Sorry, spotify link is invalid</p>');
        }


        var spotifyurl = 'https://api.spotify.com/v1/tracks/'  + encodeURIComponent(match[0]);
        $.getJSON(spotifyurl, callbackSpotifyLookup)
            .error(function() {
                $('#messages').html('<p>Sorry, that URL didn\'t yield any useful data.</p> ');
            });
    };

    // process the spotify lookup
    function callbackSpotifyLookup(data) {
        if (data) {
            $('#track').val(data.name);
            $('#artist').val(data.artists[0].name);
            $('#lookup').val('');
            $('#search').click();
        } else {
            $('#messages').html('<p>Sorry, that URL didn\'t yield any useful data.</p> ');
        }
    }


    // From DavidBiddle
    // https://github.com/hackday-people/moretrackslikethis.com/pull/4/files
    // 
    // Strip special characters from search string
    var formatSearchString = function(string){
        string = string.replace(/&/g,'').replace(/>/g,'').replace(/</g,'').replace(/"/g,'').replace(/'/g,'');
        return string;
    }
    
    
    // return functions that can be called from the outside world
    // These are used by jsonp callbacks.
    // We can't use closure references through jquery because the varying callback function names
    // break caching.
    return {
        callbackLastFMData: callbackLastFMData,
        callbackSpotifyData: callbackSpotifyData,
        callbackSpotifyLookup: callbackSpotifyLookup
    }
    
})();
