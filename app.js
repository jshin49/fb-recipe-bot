/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';
// @TODO: add gcloud in config file -> done
// @TODO: set cases for other modes
// @TODO: check for other modes and process accordingly. Check for session first
// @TODO: polish for github -> in progress
// @TODO: run cleanups for session ids or put them into a database -> very far far later. maybe never
// @TODO: Fix the 'others' button -> done

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');
  // jsonfile = require('jsonfile'),
  // fs = require('fs');

var util = require('./utility_module.js');
var spoonacular = require('./spoonacular.js');
var apiai = require("./api-ai.js");
// apiai.sendRequest(1,0,"what's dinner",(res,err)=>{console.log(res);});

var app = express();

app.set('port', process.env.PORT || 8000);
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));
app.use('/static', express.static('sessions'));


/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET =
  (process.env.MESSENGER_APP_SECRET) ?
  (process.env.MESSENGER_APP_SECRET) :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN =
  (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN =
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// Get Facebook page ID to check the sender
const PAGE_ID =
  (process.env.MESSENGER_PAGE_ID) ?
  (process.env.MESSENGER_PAGE_ID) :
  config.get('pageID');

// Get base URL of server
// const BASE_URL =
//   (config.get('herokuBaseURL') != "") ?
//   config.get('herokuBaseURL') :
//   config.get('ngrokBaseURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}


/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/implementation#subscribe_app_pages
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;
  // Make sure this is a page subscription
  if (data.object == 'page') {
    console.log(data.entry);
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          // send to API.ai for NLP, and callback is redirected to with response receivedMessage
          if (messagingEvent.sender.id != PAGE_ID){
            apiai.sendRequest(messagingEvent.sender.id, 0, messagingEvent.message.text, (res, err) => {
              if (err != null) {
                receivedMessage(messagingEvent, null, err);
              }
              if (res != null) {
                receivedMessage(messagingEvent, res, null);                
              }
              else {
                receivedMessage(messagingEvent, null, null);                
              }
            });
          }
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];
  console.log(signature);
  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference#auth
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  if (senderID == PAGE_ID) {
    console.error("Sender is self.");
    return;
  }
  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authorizationentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference#received_message
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event, res, error) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  if (senderID == PAGE_ID) {
    console.error("Sender is self.");
    return;
  }

  // API.ai outputted an error, NLP processing went wrong
  if (error != null || (res.parameters == null && res.speechResponse == null)) {
    sendTextMessage(senderID, "Sorry, I couldn't understand your message");
  }

  console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
    console.log(res);
    
    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.

    if (res.speechResponse == "Help" || res.speechResponse == "What\'s Dinner?") {
      var buttons = [{
        type: "postback",
        title: "Recommendations",
        payload: "PERSISTENT_MENU_RANDOM_RECIPE"
      },{
        type: "postback",
        title: "Search Recipe",
        payload: "PERSISTENT_MENU_SEARCH_RECIPE"
      },{
        type: "postback",
        title: "Search By Calorie",
        payload: "PERSISTENT_MENU_SEARCH_CALORIE"
      }];
      sendButtonMessage(senderID, "Choose from the following options or the menu button on the left:", buttons);
      sendTextMessage(senderID, "Please ask 'What\'s Dinner?' or choose options from the menu. You can also type 'Random' for Random Recipe Recommendations, or start by typing the ingredients or calories you want to search");
    }
    else if (res.speechResponse == "Random") {
      spoonacular.getRandomRecipe((result) => {
        console.log("Random");
        var recipe = result.body;
        var cookingTime = recipe.recipes[0].preparationMinutes + recipe.recipes[0].cookingMinutes;
        var recipeURL = recipe.recipes[0].sourceUrl;
        var recipeTitle = recipe.recipes[0].title;
        var recipeImage = recipe.recipes[0].image;
        // var recipeID = recipe.recipes[0].id;
        var spoonacularSourceUrl = recipe.recipes[0].spoonacularSourceUrl;
        var messageData = 
        {
          recipient: {
            id: senderID
          },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: [{
                  title: recipeTitle,
                  item_url: recipeURL,
                  image_url: recipeImage,
                  subtitle: "Cooking and Prep Time: " + cookingTime + " minutes",
                  buttons: [{
                    type: "web_url",
                    url: recipeURL,
                    title: "I Like It"
                  }, {
                    type: "web_url",
                    url: spoonacularSourceUrl,
                    title: "View Details"
                  }, {
                    type: "postback",
                    title: "Something Else",
                    payload: "PERSISTENT_MENU_RANDOM_RECIPE",
                  }],
                }]
              }
            }
          }
        };
        callSendAPI(messageData);
      });
    }
    else if (Object.getOwnPropertyNames(res.parameters).length != 0) {
      // Search Calorie
      // Implement Spoonacular
      if (res.parameters.hasOwnProperty('max_calorie')) {
        var min_calorie = 0;
        var max_calorie = res.parameters.max_calorie;
        if (res.parameters.min_calorie != '') {
          min_calorie = res.parameters.min_calorie;
        }
        spoonacular.getRecipesByCalorie(min_calorie, max_calorie, (result) => {
          var data = result.body
          var recipes = [];
          var recipeIDs = [];
          var counter = 0;
          var done = false;
          console.log("max calorie: "+max_calorie);
          for (var i=0; i<data.length; ++i) {
            recipeIDs.push(data[i].id);
          }
          console.log(recipeIDs);
          var messageData = 
          {
            recipient: {
              id: senderID
            },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: []
                }
              }
            }
          };

          for (var id in recipeIDs) {
            spoonacular.getRecipeByID(recipeIDs[id], (result) => {
              if (counter < recipeIDs.length) {
                ++counter;
                // console.log(result.body.recipes[0]);
                recipes.push(result.body.recipes[0]);
                if (counter == recipeIDs.length)
                  done = true;
              }

              if (done) {
                for (var i=0; i<recipes.length; ++i) {
                  var cookingTime = recipes[i].preparationMinutes + recipes[i].cookingMinutes;
                  var element = {
                    title: recipes[i].title,
                    item_url: recipes[i].sourceUrl,
                    image_url: recipes[i].image,
                    subtitle: "Cooking and Prep Time: " + cookingTime + " minutes",
                    buttons: [{
                      type: "web_url",
                      url: recipes[i].sourceUrl,
                      title: "I Like It"
                    },{
                      type: "web_url",
                      url: recipes[i].spoonacularSourceUrl,
                      title: "View More"
                    }]
                  };
                  messageData.message.attachment.payload.elements.push(element);
                } //end for

                callSendAPI(messageData);
              }
            });
          } //end outer for
        });
      }
      // Search by Ingredients
      // Implement Spoonacular
      else if (res.parameters.hasOwnProperty('ingredients1')) {
        var ingredients = [];
        var keys = Object.keys(res.parameters);
        for (var key=1; key<=keys.length; ++key) {
          var ingredient = res.parameters["ingredients"+key];
          console.log(ingredient);
          ingredients.push(ingredient);
        }

        spoonacular.getRecipesByIngredients(ingredients, (result) => {
          var data = result.body
          var recipes = [];
          var recipeIDs = [];
          var counter = 0;
          var done = false;
          for (var i=0; i<data.length; ++i) {
            recipeIDs.push(data[i].id);
          }

          var messageData = 
          {
            recipient: {
              id: senderID
            },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: []
                }
              }
            }
          };

          for (var id in recipeIDs) {
            spoonacular.getRecipeByID(recipeIDs[id], (result) => {
              if (counter < recipeIDs.length) {
                ++counter;
                // console.log(result.body.recipes[0]);
                recipes.push(result.body.recipes[0]);
                if (counter == recipeIDs.length)
                  done = true;
              }

              if (done) {
                for (var i=0; i<recipes.length; ++i) {
                  var cookingTime = recipes[i].preparationMinutes + recipes[i].cookingMinutes;
                  var element = {
                    title: recipes[i].title,
                    item_url: recipes[i].sourceUrl,
                    image_url: recipes[i].image,
                    subtitle: "Cooking and Prep Time: " + cookingTime + " minutes",
                    buttons: [{
                      type: "web_url",
                      url: recipes[i].sourceUrl,
                      title: "I Like It"
                    },{
                      type: "web_url",
                      url: recipes[i].spoonacularSourceUrl,
                      title: "View More"
                    }]
                  };
                  messageData.message.attachment.payload.elements.push(element);
                } //end for

                callSendAPI(messageData);
              }
            });
          } //end outer for
        });
      }
      else {
        sendTextMessage(senderID, res.speechResponse + " You can maybe ask 'What\'s Dinner?'");
      }
    }
    else {
      sendTextMessage(senderID, res.speechResponse + " You can maybe ask 'What\'s Dinner?'");
    }
  } 
  else if (messageAttachments) {
    console.log("No matching attachment type");
    sendTextMessage(senderID, "Message with no matching attachment type received.");
  }
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference#message_delivery
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. Read
 * more at https://developers.facebook.com/docs/messenger-platform/webhook-reference#postback
 *
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  if (senderID == PAGE_ID) {
    console.error("Sender is self.");
    return;
  }

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

  switch (payload) {
    case 'PERSISTENT_MENU_HELP':
    case 'GETTING_STARTED':
      var buttons = [{
        type: "postback",
        title: "Recommendations",
        payload: "PERSISTENT_MENU_RANDOM_RECIPE"
      },{
        type: "postback",
        title: "Search Recipe",
        payload: "PERSISTENT_MENU_SEARCH_RECIPE"
      },{
        type: "postback",
        title: "Search By Calorie",
        payload: "PERSISTENT_MENU_SEARCH_CALORIE"
      }];
      sendButtonMessage(senderID, "Choose from the following options or the menu button on the left:", buttons);
      sendTextMessage(senderID, "Please ask 'What\'s Dinner?' or choose options from the menu. You can also type 'Random' for Random Recipe Recommendations, or start by typing the ingredients or calories you want to search");
      break;

    // @TODO: Create session file that holds user data (later replace with database)
    case 'PERSISTENT_MENU_RANDOM_RECIPE':
      spoonacular.getRandomRecipe((result) => {
        console.log(result.body);
        var recipe = result.body;
        var cookingTime = recipe.recipes[0].preparationMinutes + recipe.recipes[0].cookingMinutes ;
        var recipeURL = recipe.recipes[0].sourceUrl;
        var recipeTitle = recipe.recipes[0].title;
        var recipeImage = recipe.recipes[0].image;
        var recipeID = recipe.recipes[0].id;
        var spoonacularSourceUrl = recipe.recipes[0].spoonacularSourceUrl;
        var messageData = 
          {
            recipient: {
              id: senderID
            },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: [{
                    title: recipeTitle,
                    item_url: recipeURL,
                    image_url: recipeImage,
                    subtitle: "Cooking and Prep Time: " + cookingTime + " minutes",
                    buttons: [{
                      type: "web_url",
                      url: recipeURL,
                      title: "I Like It"
                    }, {
                      type: "web_url",
                      url: spoonacularSourceUrl,
                      title: "View Details"
                    }, {
                      type: "postback",
                      title: "Something Else",
                      payload: "PERSISTENT_MENU_RANDOM_RECIPE",
                    }],
                  }]
                }
              }
            }
          };

          callSendAPI(messageData);
      });
      break;

    case 'PERSISTENT_MENU_SEARCH_RECIPE':
      // if no session, ask this
      sendTextMessage(senderID, "Please tell me what you have in your fridge, so I can help you find some recipes :)");
      break;

    case 'PERSISTENT_MENU_SEARCH_CALORIE':
      // if no session, ask this
      sendTextMessage(senderID, "Please tell us the range of Calories you want, and I will help you find some recipes :)");
      break;

    default:
      // When a postback is called, we'll send a message back to the sender to
      // let them know it was successful
      console.log("Postback called");
      sendTextMessage(senderID, "Please type 'Help' or open the menu.");
      break;
  }
}

/*
 * Send a button message using the Send API.
 *
 */
function sendMenuOthersMessage(recipientId, messageText) {
  var buttons = [{
    type: "postback",
    title: "Text Detection",
    payload: "PERSISTENT_MENU_TEXT_DETECTION"
  },{
    type: "postback",
    title: "Filter Safe Search",
    payload: "PERSISTENT_MENU_FILTER_SAFE_SEARCH"
  },{
    type: "postback",
    title: "Image Properties",
    payload: "PERSISTENT_MENU_IMAGE_PROPERTIES"
  }];

  sendButtonMessage(recipientId, messageText, buttons);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId, messageText, buttons) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: messageText,
          buttons: buttons
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendRandomRecipe(recipientId, messageData) {
  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendSearchRecipe(recipientId, messageText, attachment, payload) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: payload
      }
    }
  };

  callSendAPI(messageData);
}



/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId, messageText, attachment, payload) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message. Trying again.");
      request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData

      }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var recipientId = body.recipient_id;
          var messageId = body.message_id;

          console.log("Successfully sent generic message with id %s to recipient %s",
            messageId, recipientId);
        } else {
          console.error("Unable to send message.");
          // console.error(response);
          console.error(error);
        }
      });
      // console.error(response);
      console.error(error);
    }
  });
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
