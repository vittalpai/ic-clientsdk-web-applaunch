(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals init
        root.IBMAppLaunch = factory();
    }
}(this, function() {
    // private methods
    function myFunc(){};

    function appLaunchConfig() {
      this.policy = null;
      this.deviceID = null;
      this.cacheExpiration = null;
      this.eventFlushInterval = null;

      this.Builder = function() {
        var policy = null;
        var deviceID = null;
        var cacheExpiration = 30;
        var eventFlushInterval = 30;

        return {
          fetchPolicy : function(refreshPolicy) {
            this.policy = refreshPolicy;
            return this;
          },
          cacheExpiration : function(cacheExpiration) {
            this.cacheExpiration = cacheExpiration;
            return this;
          },
          eventFlushInterval : function(eventFlushInterval) {
            this.eventFlushInterval = eventFlushInterval;
            return this;
          },
          deviceID : function(deviceID) {
            this.deviceID = deviceID;
            return this;
          },
          build : function() {
            var config = new appLaunchConfig();
            config.policy = policy;
            config.deviceID = deviceID;
            config.cacheExpiration = cacheExpiration;
            config.eventFlushInterval = eventFlushInterval;
            return config
          }
        };
      };
    };

    function appLaunchUser() {
      this.userID = null;
      this.attributes = null;

      this.Builder = function() {
        var userID = null;
        var attributes = null;

        return {
          userID : function(username) {
            userID = username;
            return this;
          },
          attributes : function(time) {
            attributes = time;
            return this;
          },
          build : function() {
            var user = new appLaunchUser();
            user.userID = userID;
            user.attributes = attributes;
            return user;
          }
        };
      };
    };



    // exposed public method
    return {
  	    initialize: _initialize,
        destroy: _destroy,
        AppLaunchConfig: _appLaunchConfig,
        AppLaunchUser: _appLaunchUser,
        sendMetrics: _sendMetrics,
        isFeatureEnabled: _isFeatureEnabled,
        getPropertyofFeature: _getPropertyofFeature,
        displayInAppMessages: _displayInAppMessages
  	}
}));
