// SAMPLE USAGE
// var api-ai = require("./api-ai.js");

// api-ai.sendRequest("some_session_id_as_hash_string","pre_order","I want to book a flight", function(response, err) {
//   if (err) {
//     return;
//   }
//   console.log(response);
// });

var config = require("config");

// Get API.ai key from config
const APIAI =
  (process.env.APIAI) ?
  (process.env.APIAI) :
  config.get('apiAiKey');

var apiai = require("apiai")(APIAI);

module.exports.sendRequest = function(session_id, context, request_text, callback) {
  var request = apiai.textRequest(request_text, {contexts:[{"name":context,"lifespan":1}], sessionId:session_id});

  request.on("response", function(response) {
    // console.log(response);
    var next_action = response.result.action;
    var next_context = context;

    if (response.result.action=="smalltalk.unknown") {
      console.log("FAIL: nlp recognition failure");
      next_action = null;
    } else if (response.result.action=="input.unknown"){
      next_action = null;
    }

    var simplifiedResponse = {"session_id":session_id, "next_context":next_context, "action":next_action,"parameters":response.result.parameters, "speechResponse":response.result.fulfillment.speech};
    //console.log(simplifiedResponse);
    callback(simplifiedResponse, null);
  });
  request.on("error", function(err) {
    console.log("ERROR: nlp request failed");
    callback(null, err);
  });
  request.end();

}

// Test API-AI

// this.sendRequest(1,"1","what's dinner",(res,err)=>{console.log(res);});
// this.sendRequest(1,"1","I have chicken and onions and garlic and pepper",(res,err)=>{console.log("1");console.log(res);});
// this.sendRequest(1,"1","I have chicken and lemon and garlic and pepper",(res,err)=>{console.log("2");console.log(res);});
// this.sendRequest(1,"1","I have lemon and onions and garlic and pepper",(res,err)=>{console.log("3");console.log(res);});
// this.sendRequest(1,"1","I have spring onions and onions and garlic and pepper",(res,err)=>{console.log("4");console.log(res);});
// this.sendRequest(1,"1","I have milk and onions and garlic and pepper",(res,err)=>{console.log("5");console.log(res);});
// this.sendRequest(1,"1","I want something with chicken, milk, and onions",
//   (res,err)=>{
//     var ingredients = [];
//     var keys = Object.keys(res.parameters);
//     for (var i=1; i<=keys.length; ++i) {
//       var ingredient = res.parameters["ingredients"+i];
//       console.log(ingredient);
//       ingredients.push(ingredient);
//     }
//   });
// this.sendRequest(1,"1","I want a recipe with chicken, milk, and onions",(res,err)=>{console.log("7");console.log(res);});
// this.sendRequest(1,"1","I want a 300 calorie recipe",(res,err)=>{console.log("8");console.log(res);});
// this.sendRequest(1,"1","Give me a 500 calorie recipe",(res,err)=>{console.log("9");console.log(res);});
// this.sendRequest(1,"1","700 calorie",(res,err)=>{console.log("10");console.log(res);});
// this.sendRequest(1,"1","500~700 calories",(res,err)=>{console.log("11");console.log(res);});
// this.sendRequest(1,"1","500~700 calorie",(res,err)=>{console.log("12");console.log(res);});
// this.sendRequest(1,"1","500~700",(res,err)=>{console.log("13");console.log(res);});
// this.sendRequest(1,"1","what's dinner",(res,err)=>{console.log("13");console.log(res);});
