let esClient = require('../../../bin/elasticsearch/elastic-connection');
let config = require('config');


let Q = require('q');

let esIndex = config.get('elasticsearch.index');
let articleType = config.get('elasticsearch.article_type');

const chalk = require('chalk');

let self = module.exports = {

  /**
   * Generate Index Storage and Mapping
   */
  initializeES: function () {
    let deferred = Q.defer();
    /**
     * Init index 
     */
    esClient.indices.exists({
      index: esIndex
    }).then((result) => {
      if (result === false) {
        esClient.indices.create({
          index: esIndex
        });
      }
    }).then(() => {
      esClient.indices.putMapping({
        index: esIndex,
        type: articleType,
        body: {
          "properties": {
            "title": {
              type: "string"
            },
            "description": {
              type: "string"
            },
            "header_image": {
              type: "string"
            },
            "category": {
              type: "string"
            },
            "content": {
              type: "string"
            },
            "tags": {
              properties: {
                "name": {
                  type: "string"
                }
              }
            },
            "suggest": {
              type: "completion",
              analyzer: "simple",
              search_analyzer: "simple"
            }
          }
        }
      }).then((result) => {
        deferred.resolve(result);
      });
    });
    return deferred.promise;
  },

  addArticleToIndex: function (article) {
    let deferred = Q.defer();

    esClient.index({
      index: esIndex,
      type: articleType,
      id: article._id.toString(),
      body: {
        "title": article.title,
        "description": article.description,
        "header_image": article.header_image,
        "category": article.category,
        "content": article.content,
        "tags": article.tags
      }
    }).then((result, err) => {
      if (err) {
        console.log(chalk.red(err));
        deferred.reject(err);
      }
      deferred.resolve(result);
    });
    return deferred.promise;
  },

  indexContainArticle: function (article) {
    let deferred = Q.defer();
    esClient.exists({
      id: article._id.toString(),
      index: esIndex,
      type: articleType
    }).then(result => {
      if (result) deferred.resolve(true);
      deferred.resolve(false);
    });
    return deferred.promise;
  },

  flushAllIndices: function () {
    let deferred = Q.defer();
    esClient.deleteByQuery({
      index: esIndex,
      body: {
        "query": {
          "match_all": {}
        }
      },
      expandWildcards: "all"

    }, (err, res) => {
      if (err) {
        console.log(chalk.red(err));
        deferred.reject(err);
      } else
        console.log(chalk.green('Indices removed !'));
      deferred.resolve();
    });
    return deferred.promise;
  },

  searchArticle: function (text) {
    let deferred = Q.defer();
    esClient.search({
      index: esIndex,
      type: articleType,
      body: {
        "query": {
          "match": {
            "_all": text
          }
        }
      }
    }).then((result, err) => {
      if (err)
        deferred.reject(err);
      deferred.resolve(result);
    });
    return deferred.promise;
  }
}