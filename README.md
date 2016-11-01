# fb-recipe-bot
Facebook Messenger Bot that consumes the Spoonacular Food API to allow recipe search and recommendation.

Features of this bot are following;

- Random Recipe Recommendation
  - Returns randomly recommended recipes when you are out of ideas
- Search Recipe by Ingredients
  - Input the bot with ingredients in your fridge to see what you can make out of them

First, check out the [Quickstart Guide](https://developers.facebook.com/docs/messenger-platform/quickstart) provided by Facebook.

Second, mkdir config and add a default.json inside config with the following contents:

```javascript
{
  "herokuBaseUrl": "YOUR HEROKU URL WITH TRAILING SLASH",
  "ngrokBaseUrl": "YOUR NGROK URL WITH TRAILING SLASH",
  "apiAiKey": "YOUR API.AI API KEY",
  "spoonacularAPIKey": "YOUR SPOONACULAR API KEY",
  "spoonacularAPIBaseURL": "https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/",
  "appID": "YOUR FACEBOOK APP ID",
  "pageID": "YOUR FACEBOOK PAGE ID",
  "appSecret": "YOUR FACEBOOK APP SECRET",
  "pageAccessToken": "YOUR FACEBOOK PAGE ACCESS TOKEN",
  "validationToken": "YOUR OWN TOKEN" (by default, "just_do_it")
}
```

Third, power your bot with NLP using API.ai. (train it to accept commands, ingredients, and calories as inputs)


## Running Locally
0. Install Node.js, NPM, and [ngrok](https://ngrok.com/) (or [localtunnel](https://localtunnel.me/))
1. Run "sudo npm install" command to install external modules locally
2. Run "node app.js" to run the app
3. Enter localhost:8080 on the web url to check (All static files are served in the 'public' folder)
4. Enter ngrok http 8080 to tunnel a connection from https://foo.ngrok.io to localhost
5. Give https://foo.ngrok.io/webhook for your webhook verificaiton URL in the Messenger App settings
6. Now for every message, you can check the response and request through your console.

## Running on Heroku
0. Do steps 0~1 from above and install Heroku toolbelt from the Heroku website
1. Run "heroku login"
2. If existing repository, simply add a remote to heroku with this command: heroku git:remote -a YOUR_HEROKU_APP
3. Else, run the following codes

  - heroku git:clone -a fb-recipe-bot && cd fb-recipe-bot
  - git add . && git commit -am "make it better" && git push heroku master

4. Give https://yourheroku.herokuapp.com/webhook for your webhook verificaiton URL in the Messenger App settings
5. Voila :)
6. Alternatively, you can connect your herokuapp to GitHub, and set it to automatically deploy whenever a commit is made.

Or you can simply click

@TODO: (Will add deploy to heroku button here later)
