const
  config = require('config'),
  request = require('request');

/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN =
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

if (!PAGE_ACCESS_TOKEN) {
  console.error("Missing config values");
  process.exit(1);
}


/*
 * Set the Greeting Text. The greeting text data goes in the body.
 * If successful, we'll get a success message in the response.
 *
 */
function setGreetingText(greetingText) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: greetingText

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error("Unable to set Greeting Text.");
      console.error(error);
    }
  });
}

/*
 * Set the Getting Started Button.
 * If successful, we'll get a success message in the response.
 *
 */
function setGettingStarted(gettingStarted) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: gettingStarted

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error("Unable to set Getting Started Button.");
      console.error(error);
    }
  });
}

/*
 * Set the Persistent Menu List.
 * If successful, we'll get a success message in the response.
 *
 */
function setPersistentMenu(menuList) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: menuList

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error("Unable to set Persistent Menu.");
      console.error(error);
    }
  });
}

/*
 * Delete the Getting Started Button.
 * If successful, we'll get a success message in the response.
 *
 */
function deleteGettingStarted() {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'DELETE',
    json: deleteReq

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error("Unable to delete Getting Started Button.");
      console.error(error);
    }
  });
}

/*
 * Delete the Persistent Menu List.
 * If successful, we'll get a success message in the response.
 *
 */
function deletePersistentMenu(deleteReq) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'DELETE',
    json: deleteReq

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error("Unable to delete Getting Started Button.");
      console.error(error);
    }
  });
}

var greetingText = {
  "setting_type":"greeting",
  "greeting":{
    "text":"If you don't know what to eat, ask \"What's Dinner?\""
  }
};

var gettingStarted = {
  "setting_type":"call_to_actions",
  "thread_state":"new_thread",
  "call_to_actions":[
    {
      "payload":"GETTING_STARTED"
    }
  ]
};

var menuList = {
  "setting_type" : "call_to_actions",
  "thread_state" : "existing_thread",
  "call_to_actions":[
    {
      "type":"postback",
      "title":"Help",
      "payload":"PERSISTENT_MENU_HELP"
    },
    {
      "type":"postback",
      "title":"Random Recipes",
      "payload":"PERSISTENT_MENU_RANDOM_RECIPE"
    },
    {
      "type":"postback",
      "title":"Search Recipes",
      "payload":"PERSISTENT_MENU_SEARCH_RECIPE"
    },
    {
      "type":"postback",
      "title":"Search Calorie",
      "payload":"PERSISTENT_MENU_SEARCH_CALORIE"
    }
  ]
};
console.log(PAGE_ACCESS_TOKEN);
var deleteReq = {
  "setting_type":"call_to_actions",
  "thread_state":"existing_thread"
};

if (process.env.INIT) {
  console.log("INIT");
  setGreetingText(greetingText);
  setGettingStarted(gettingStarted);
  setPersistentMenu(menuList);
}
else if (process.env.DELETE) {
  console.log("DELETE");
  deleteGettingStarted(deleteReq);
  deletePersistentMenu(deleteReq);
}
else {
  console.log("NONE");
}
