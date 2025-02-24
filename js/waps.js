/*
	waps.js
	- Helpers to process and render the analysis of Whatsapp Posts
*/

//selecting all required elements
const dropArea = document.querySelector(".file-upload-container");
const dragText = dropArea.querySelector("header");

// ------ ------ ------ ------ ------ ------ ------ ------ ------ ------
//  Handle File drag and drop
// ------ ------ ------ ------ ------ ------ ------ ------ ------ ------
//If user Drag File Over DropArea
function wapsHandleDragOver(event) {
    event.stopPropagation();
    event.preventDefault(); //preventing from default behaviour
    dropArea.classList.add("waps_drag");
    dragText.textContent = "Release to Process File";
};

//If user leave dragged File from DropArea
function wapsHandleDragLeave()
{
    event.stopPropagation();
    dropArea.classList.remove("waps_drag");
    dragText.innerHTML = "Drag & Drop OR <br/> Select File to process";
};

function wapsCompleteProcessing() {
    wapsHandleDragLeave();
};

// remember threshold in milliseconds
var g_SESSION_TIME_THRESHOLD = 600*60*1000; // 60 minutes = 60 * 60 seconds

// ------ ------ ------ ------ ------ ------ ------ ------ ------ ------
//  Analysis of Whatsapp threads
// ------ ------ ------ ------ ------ ------ ------ ------ ------ ------
function processForPosterFrequency( lines) {
    const frequencies = {};
    var numPosts = 0;
    var numLinesInMessage = 1;
    var thisSession = [];
    var lastSessionTime = 0;
    const sessions = [thisSession];

    console.log( `Using Session duration as: ${g_SESSION_TIME_THRESHOLD}`);

    // format 1 on iOS: [10/29/16, 5:31:58 PM] Srikanth Avadhanam: ABCD
    // format 2 on Android: 4/24/15, 6:06 PM - Srikanth Avadhanam: ABCD
    
    for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    // match for both iOS and Android formats
    const lineParts = line.match(/^\[(.*)\] (.+?):/) || line.match(/^(.*)\ - \ (.+?):/);
    if (lineParts) {
        // Add current line to the posterFrequency
        // lineParts are:
        //  [0] = [date, time] name:
        //  [1] = "date, time"
        //  [2] = "postername"
        // ex: [ 
        //  "[4/21/23, 9:18:55 PM] Ram:", 
        //  "4/21/23, 9:18:55 PM", 
        //  "Ram"]
        //
        // console.log( lineParts);
        const poster = lineParts[2];
        
        frequencies[poster] = (frequencies[poster] || 0) + 1;

        // check and add session as applicable
        const msg = { poster: poster, at: new Date( lineParts[1]), text: line};
        // ToDo: add full message 
        if ( msg.at.getTime() - lastSessionTime > g_SESSION_TIME_THRESHOLD) {
        // open a new session
        thisSession = [msg]; // start a new session
        sessions.push( thisSession);
        } else {
        thisSession.push( msg); // add message to existing session
        }

        // update last session time
        lastSessionTime = msg.at.getTime();
        numPosts++;
    } // ignore lines that do not match our expected pattern
    else {
        numLinesInMessage++;  // more lines added to prior message
    }
    }

    // sort in reverse order
    const sortedFrequencies = Object.keys(frequencies)
    .sort((a, b) => frequencies[b] - frequencies[a]);

    return { 
    totalPosts: numPosts,
    frequencies: frequencies, 
    sortedFrequencies: sortedFrequencies,
    sessions: sessions };
}

// ------ ------ ------ ------ ------ ------ ------ ------ ------ ------
//  Render results of Analysis
// ------ ------ ------ ------ ------ ------ ------ ------ ------ ------

function frequencyToHtml( frequency, message) {
    return "<span class='poster_frequency'>" + frequency.toLocaleString() + "</span>" 
    + " " + message + "<br>";
}

function renderAnalysisSummary( fileName, wapsData, summaryTarget ) {

    let outputSummary = "<h4>Quick Summary</h4>";
    // let totalPosts = 0;
    // Object.keys(frequencies).forEach( (poster, i) => { totalPosts += frequencies[poster]; })
    outputSummary += frequencyToHtml( wapsData.totalPosts, "Posts from all users");
    
    outputSummary += "<br/>" + frequencyToHtml( wapsData.sortedFrequencies.length, "Posters");
    outputSummary += "<br/>" + frequencyToHtml( wapsData.sessions.length, "Sessions");
    outputSummary += "<hr/>" + "Inputs from: " + fileName; 
    console.log( wapsData.sessions.length);

    document.getElementById(summaryTarget).innerHTML = outputSummary;
}

function renderAnalysisDetails( wapsData, detailsTarget ) {
    // sort in reverse order

    let output = "<h4> Post Frequency per User</h4>";
    wapsData.sortedFrequencies.forEach( (poster, i) => {
    output += frequencyToHtml( wapsData.frequencies[poster], poster);
    });
    document.getElementById(detailsTarget).innerHTML = output;
    };    

function processFile( file) {
    console.log( " ----- Processing File ", file.name)
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function() {
    const content = reader.result;
    const lines = content.split("\n");
    const wapsData = processForPosterFrequency( lines);
    renderAnalysisSummary( file.name, wapsData, "wat_summary" );
    renderAnalysisDetails( wapsData, "wat_frequency");
    wapsCompleteProcessing();
    }
}

function wapsProcessInputFile( event) {
    event.preventDefault();
    const file = document.getElementById("file-input").files[0];
    processFile( file);
}

function wapsSetSessionDuration( event) {
    event.preventDefault();
    const sdText = document.getElementById("session-duration").value;
    try {
    const sessionDurationInMinutes = parseInt( sdText);
    if (!sessionDurationInMinutes) {
        console.log( "Error in the input number provided. ", sdText);
    } else {
        console.log( `Session Duration is set as: ${sessionDurationInMinutes}`);
        g_SESSION_TIME_THRESHOLD = sessionDurationInMinutes * 60 * 1000; // in milliseconds
    }
    } catch (e) {
    console.log( "Error in the input number provided. ", e);
    }
}

//If user drop File on DropArea
function wapsDrop(event) {
    event.preventDefault();
    // use only the first file selected by the user
    //  [0] this means if user select multiple files then we'll select only the first one
    const file = event.dataTransfer.files[0];
    processFile( file);
}  