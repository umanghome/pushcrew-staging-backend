var bodyParser = require('body-parser');
var express = require('express');
var request = require('request');
var firebase = require('firebase-admin');
var app = express();

var FIREBASE_API_KEY = "YOUR-FIREBASE-API-KEY";
var FIREBASE_DATABASE_URL = "YOUR-FIREBASE-DATABASE-URL";
var SLACK_TOKEN = "YOUR-SLACK-TOKEN";

var firebaseConfig = {
  credential: firebase.credential.cert('path-to-firebase-admin-cert.json'),
  databaseURL: FIREBASE_DATABASE_URL
};

firebase.initializeApp(firebaseConfig)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
  return response.send('Hi!');
});

var sendFreeStagings = function (response_url) {
  firebase.database().ref('stagings').once('value').then(snapshot => {
    var values = snapshot.val();
    var keys = Object.keys(values);
    var arr = [];
    for (var i = 0; i < keys.length; i++) {
      var v = values[keys[i]];
      if (v.free) {
        arr.push(v.name + ' at ' + v.ip);
      }
    }
    var text = 'No staging instances are free!';
    if (arr.length > 0) {
      text = 'Free Staging instances:\n' + arr.join('\n');
    }
    sendStatus(response_url, text);
  });

};

var sendUsedStagings = function (response_url) {
  firebase.database().ref('stagings').once('value').then(snapshot => {
    var values = snapshot.val();
    var keys = Object.keys(values);
    var arr = [];
    for (var i = 0; i < keys.length; i++) {
      var v = values[keys[i]];
      if (!v.free) {
        arr.push(v.occupant + ' is using ' + v.name + ' at ' + v.ip + ' for ' + v.purpose);
      }
    }
    var text = 'No staging instances are in use!';
    if (arr.length > 0) {
      text = 'Used Staging instances:\n' + arr.join('\n');
    }
    sendStatus(response_url, text);
  });
  
};

var sendStatus = function(response_url, text) {
  text += '\nUpdate staging at: <URL-TO-UPDATE>';
  request({
    method: 'POST',
    url: response_url,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text
    })
  });
};


app.post('/', function (req, res) {
  if (!req.body.token || req.body.token != SLACK_TOKEN) {
    return res.status(401).send({text: 'Token mismatch.'});
  }
  response_url = req.body.response_url;
  text = req.body.text;
  res_string = '';
  switch (text) {
    case 'free':
      sendFreeStagings(response_url);
      res_string = 'Checking status of FREE Staging Instances..';
      break;
    case 'used':
      sendUsedStagings(response_url);
      res_string = 'Checking status of USED Staging Instances..';
      break;
    default:
      sendFreeStagings(response_url);
      sendUsedStagings(response_url);
      res_string = 'Checking status of ALL Staging Instances..';
  }
  res.status(200).send({text: res_string});
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
