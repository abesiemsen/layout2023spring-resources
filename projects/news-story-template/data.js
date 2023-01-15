const newsTemplate = new Vue({
  el: '#news-stories-list-template',

  data: function() {
    return {
      apikey: 'fb29b89fc52abbc1dc8db3c744cb651c',
      cacheDuration: 1000 * 60 * 60 * 2,
      currentStoryId: 0,
      allStories: []
    };
  },

  created: function() {
    this.retrieveStories()
      .then(storiesResponse => {
        this.allStories = storiesResponse.articles
          .map(article => {
            return {
              ...article,
              date: new Date(article.publishedAt).toLocaleDateString(),
            }
          })
      });
  },

  computed: {
    featuredStory: vm => vm.allStories[0] || {},
    stories: vm => vm.allStories.slice(1)
  },

  methods: {

    load: function(relatedStory) {
    },

    retrieveStories: function() {
      const fromCache = window.localStorage.getItem('stories');
      if (!!fromCache) {
        const data = JSON.parse(fromCache);
        if ( (data.retrievedAt + this.cacheDuration) > new Date().getTime() ) {
          return Promise.resolve(data);
        }
      }
      return this.getStoriesFromAPI();
    },

    getStoriesFromAPI: function () {
      const url = 'https://gnews.io/api/v4/top-headlines?' + 
        '&lang=en' +
        '&token=' + this.apikey;
      const req = new Request(url);
      return fetch(req)
        .then(result => result.json())
        .then(json => {
          json.retrievedAt = new Date().getTime();
          return json;
        })
        .then(json => {
          window.localStorage.setItem('stories', JSON.stringify(json));
          return json;
        });
    },

  },

  filters: {
    json: function (value) {
      return JSON.stringify(value, null, 2);
    }
  }
});
