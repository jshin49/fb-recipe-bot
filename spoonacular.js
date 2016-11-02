const
  config = require('config'),
  unirest = require('unirest');

/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// Get base URL of Spoonacular API
const SPOONACULAR_API_BASE_URL = 
  (process.env.SPOONACULAR_API_BASE_URL) ?
  (process.env.SPOONACULAR_API_BASE_URL) :
  config.get('spoonacularAPIBaseURL');

// Get Spoonacular API key
const SPOONACULAR_API_KEY = 
  (process.env.SPOONACULAR_API_KEY) ?
  (process.env.SPOONACULAR_API_KEY) :
  config.get('spoonacularAPIKey');

if (!(SPOONACULAR_API_BASE_URL && SPOONACULAR_API_KEY)) {
  console.error("Missing config values");
  process.exit(1);
}

module.exports = {

	getRecipeByID: function(id, callback) {
    unirest
    .get(SPOONACULAR_API_BASE_URL+"recipes/random?limitLicense=false&number=1")
    .header("X-Mashape-Key", SPOONACULAR_API_KEY)
    .header("Accept", "application/json")
    .end(function (result) {
    	callback(result);
    });
	},

	getRandomRecipe: function(callback) {
    unirest
    .get(SPOONACULAR_API_BASE_URL+"recipes/random?limitLicense=false&number=1")
    .header("X-Mashape-Key", SPOONACULAR_API_KEY)
    .header("Accept", "application/json")
    .end(function (result) {
    	callback(result);
    });
	},

	getRecipesByIngredients: function(ingredients, callback) {
    var url = SPOONACULAR_API_BASE_URL+"recipes/findByIngredients?fillIngredients=false&ingredients=";
    for (var i=0; i<ingredients.length;++i) {
    	if (i <ingredients.length-1)
      	url += ingredients[i]+"%2C+";
      else
      	url += ingredients[i];
    }
    url += "limitLicense=false&number=5&ranking=1";

		unirest.get(url)
		.header("X-Mashape-Key", SPOONACULAR_API_KEY)
		.header("Accept", "application/json")
		.end(function (result) {
			callback(result);
		});
	},

	getRecipesByCalorie: function(min_calorie, max_calorie, callback) {
		unirest.get(SPOONACULAR_API_BASE_URL+"recipes/findByNutrients?maxcalories="+max_calorie+"&maxcarbs=100&maxfat=20&maxprotein=100&mincalories="+min_calorie+"&minCarbs=0&minfat=5&minProtein=0&number=5&offset=0&random=true")
		.header("X-Mashape-Key", SPOONACULAR_API_KEY)
		.header("Accept", "application/json")
		.end(function (result) {
			callback(result);
		});
	}

};
