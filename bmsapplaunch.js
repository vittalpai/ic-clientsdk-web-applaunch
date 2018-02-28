(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(factory);
  } else {
    // Browser globals init
    root.IBMAppLaunch = factory();
  }
}(this, function() {

  (function(global) {
    function isArray(arr) {
      return Object.prototype.toString.call(arr) === '[object Array]';
    }

    function foreach(arr, handler) {
      if (isArray(arr)) {
        for (var i = 0; i < arr.length; i++) {
          handler(arr[i]);
        }
      }
      else
      handler(arr);
    }

    function D(fn) {
      var status = 'pending',
      doneFuncs = [],
      failFuncs = [],
      progressFuncs = [],
      resultArgs = null,

      promise = {
        done: function() {
          for (var i = 0; i < arguments.length; i++) {
            // skip any undefined or null arguments
            if (!arguments[i]) {
              continue;
            }

            if (isArray(arguments[i])) {
              var arr = arguments[i];
              for (var j = 0; j < arr.length; j++) {
                // immediately call the function if the deferred has been resolved
                if (status === 'resolved') {
                  arr[j].apply(this, resultArgs);
                }

                doneFuncs.push(arr[j]);
              }
            }
            else {
              // immediately call the function if the deferred has been resolved
              if (status === 'resolved') {
                arguments[i].apply(this, resultArgs);
              }

              doneFuncs.push(arguments[i]);
            }
          }

          return this;
        },

        fail: function() {
          for (var i = 0; i < arguments.length; i++) {
            // skip any undefined or null arguments
            if (!arguments[i]) {
              continue;
            }

            if (isArray(arguments[i])) {
              var arr = arguments[i];
              for (var j = 0; j < arr.length; j++) {
                // immediately call the function if the deferred has been resolved
                if (status === 'rejected') {
                  arr[j].apply(this, resultArgs);
                }

                failFuncs.push(arr[j]);
              }
            }
            else {
              // immediately call the function if the deferred has been resolved
              if (status === 'rejected') {
                arguments[i].apply(this, resultArgs);
              }

              failFuncs.push(arguments[i]);
            }
          }

          return this;
        },

        always: function() {
          return this.done.apply(this, arguments).fail.apply(this, arguments);
        },

        progress: function() {
          for (var i = 0; i < arguments.length; i++) {
            // skip any undefined or null arguments
            if (!arguments[i]) {
              continue;
            }

            if (isArray(arguments[i])) {
              var arr = arguments[i];
              for (var j = 0; j < arr.length; j++) {
                // immediately call the function if the deferred has been resolved
                if (status === 'pending') {
                  progressFuncs.push(arr[j]);
                }
              }
            }
            else {
              // immediately call the function if the deferred has been resolved
              if (status === 'pending') {
                progressFuncs.push(arguments[i]);
              }
            }
          }

          return this;
        },

        then: function() {
          // fail callbacks
          if (arguments.length > 1 && arguments[1]) {
            this.fail(arguments[1]);
          }

          // done callbacks
          if (arguments.length > 0 && arguments[0]) {
            this.done(arguments[0]);
          }

          // notify callbacks
          if (arguments.length > 2 && arguments[2]) {
            this.progress(arguments[2]);
          }
        },

        promise: function(obj) {
          if (obj == null) {
            return promise;
          } else {
            for (var i in promise) {
              obj[i] = promise[i];
            }
            return obj;
          }
        },

        state: function() {
          return status;
        },

        debug: function() {
          console.log('[debug]', doneFuncs, failFuncs, status);
        },

        isRejected: function() {
          return status === 'rejected';
        },

        isResolved: function() {
          return status === 'resolved';
        },

        pipe: function(done, fail, progress) {
          return D(function(def) {
            foreach(done, function(func) {
              // filter function
              if (typeof func === 'function') {
                deferred.done(function() {
                  var returnval = func.apply(this, arguments);
                  // if a new deferred/promise is returned, its state is passed to the current deferred/promise
                  if (returnval && typeof returnval === 'function') {
                    returnval.promise().then(def.resolve, def.reject, def.notify);
                  }
                  else {	// if new return val is passed, it is passed to the piped done
                    def.resolve(returnval);
                  }
                });
              }
              else {
                deferred.done(def.resolve);
              }
            });

            foreach(fail, function(func) {
              if (typeof func === 'function') {
                deferred.fail(function() {
                  var returnval = func.apply(this, arguments);

                  if (returnval && typeof returnval === 'function') {
                    returnval.promise().then(def.resolve, def.reject, def.notify);
                  } else {
                    def.reject(returnval);
                  }
                });
              }
              else {
                deferred.fail(def.reject);
              }
            });
          }).promise();
        }
      },

      deferred = {
        resolveWith: function(context) {
          if (status === 'pending') {
            status = 'resolved';
            var args = resultArgs = (arguments.length > 1) ? arguments[1] : [];
            for (var i = 0; i < doneFuncs.length; i++) {
              doneFuncs[i].apply(context, args);
            }
          }
          return this;
        },

        rejectWith: function(context) {
          if (status === 'pending') {
            status = 'rejected';
            var args = resultArgs = (arguments.length > 1) ? arguments[1] : [];
            for (var i = 0; i < failFuncs.length; i++) {
              failFuncs[i].apply(context, args);
            }
          }
          return this;
        },

        notifyWith: function(context) {
          if (status === 'pending') {
            var args = resultArgs = (arguments.length > 1) ? arguments[1] : [];
            for (var i = 0; i < progressFuncs.length; i++) {
              progressFuncs[i].apply(context, args);
            }
          }
          return this;
        },

        resolve: function() {
          return this.resolveWith(this, arguments);
        },

        reject: function() {
          return this.rejectWith(this, arguments);
        },

        notify: function() {
          return this.notifyWith(this, arguments);
        }
      }

      var obj = promise.promise(deferred);

      if (fn) {
        fn.apply(obj, [obj]);
      }

      return obj;
    }

    D.when = function() {
      if (arguments.length < 2) {
        var obj = arguments.length ? arguments[0] : undefined;
        if (obj && (typeof obj.isResolved === 'function' && typeof obj.isRejected === 'function')) {
          return obj.promise();
        }
        else {
          return D().resolve(obj).promise();
        }
      }
      else {
        return (function(args){
          var df = D(),
          size = args.length,
          done = 0,
          rp = new Array(size);	// resolve params: params of each resolve, we need to track down them to be able to pass them in the correct order if the master needs to be resolved

          for (var i = 0; i < args.length; i++) {
            (function(j) {
              var obj = null;

              if (args[j].done) {
                args[j].done(function() { rp[j] = (arguments.length < 2) ? arguments[0] : arguments; if (++done == size) { df.resolve.apply(df, rp); }})
                .fail(function() { df.reject(arguments); });
              } else {
                obj = args[j];
                args[j] = new Deferred();

                args[j].done(function() { rp[j] = (arguments.length < 2) ? arguments[0] : arguments; if (++done == size) { df.resolve.apply(df, rp); }})
                .fail(function() { df.reject(arguments); }).resolve(obj);
              }
            })(i);
          }

          return df.promise();
        })(arguments);
      }
    },

    D.isEmptyObject = function( obj ) {
      var name;
      for ( name in obj ) {
        return false;
      }
      return true;
    }

    global.Deferred = D;
    global.BMSJQ = D;
    global.BMSJQ.Deferred = function () {
      return new Deferred();
    }
  })(window);

  // Utils
  function validateString(str) {
    if (typeof str == 'undefined' || !str || str.length === 0 || str === "" || !/[^\s]/.test(str) || /^\s*$/.test(str) || str.replace(/\s/g,"") === "")
    {
      return true;
    }
    else
    {
      return false;
    }
  }
  // private methods
  __ICConfig = function() {
      /*jshint strict:false, maxparams:4*/
      var config;
      var user;
      var URLBuilder;
      var isInitialized = false; //default value

      this.__getConfig= function() {
      	return config;
      }

      this.__setConfig=function(appConfig) {
      	config = appConfig;
      }

      this.__getUser= function() {
        return user;
      }

      this.__setUser= function(userObj) {
        user = userObj;
      }

      this.__getURLBuilder= function() {
      	return URLBuilder;
      }

      this.__setURLBuilder=function(builder) {
      	URLBuilder = builder;
      }
  };

  IC.Config = new __ICConfig;

  __URLBuilder = function(appLaunchRegion, appLaunchAppID, appLaunchDeviceID) {
    const baseURL = 'https://applaunch' + region + '/applaunch/v1'
    const appID = appLaunchAppID
    const deviceID = appLaunchDeviceID

    this.__getAppRegistrationURL = function(){
        return this.baseURL + '/apps/' + this.applicationID + '/devices'
    }

    this.__getUserURL = function() {
        return this.__getAppRegistrationURL() + '/' + this.deviceID
    }

    this.__getActionURL = function() {
        return this.__getAppRegistrationURL() + '/' + this.deviceID + '/actions'
    }

    this.__getMetricsURL = function() {
        return this.__getAppRegistrationURL() + '/' + this.deviceID + '/events/metrics'
    }

    this.__getSessionURL = function() {
        return this.__getAppRegistrationURL() + '/' + this.deviceID + '/events/sessionActivity'
    }
  }

  __registerDevice = function() {
    
  }

  function _appLaunchConfig() {
    this.policy = null;
    this.deviceID = null;
    this.cacheExpiration = null;
    this.eventFlushInterval = null;

    this.__getPolicy= function() {
      return policy;
    }

    this.__getDeviceID= function() {
      return deviceID;
    }

    this.__getCacheExpiration= function() {
      return cacheExpiration;
    }

    this.__getEventFlushInterval= function() {
      return eventFlushInterval;
    }

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

  function _appLaunchUser() {
    this.userID = null;
    this.attributes = {};

    this.__getUserID= function() {
      return userID;
    }

    this.__getAttributes= function() {
      return attributes;
    }

    this.Builder = function() {
      var userID = null;
      var attributes = {};

      return {
        userID : function(username) {
          userID = username;
          return this;
        },
        attributes : function(key, value) {
          attributes[key] = value;
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

  function _initialize(ICRegion, appGUID, clientSecret, appLaunchConfig, appLaunchUser) {
    var dfd = BMSJQ.Deferred();
    if(validateString(ICRegion) && validateString(appGUID) && validateString(clientSecret) && validateString(appLaunchUser.userID)) {
      var builder = new __URLBuilder(ICRegion, appGUID, appLaunchUser.__getDeviceID());
      IC.Config.__setConfig(appLaunchConfig);
      IC.Config.__setUser(appLaunchUser);
      IC.Config.__setURLBuilder(builder);
      __registerDevice();
      dfd.resolve("Success")
    } else {
      dfd.reject('AppLaunch is not Initialized')
    }

    if AppLaunchUtils.validateString(object: clientSecret) &&  AppLaunchUtils.validateString(object: appId) && AppLaunchUtils.validateString(object: user.getUserId() ){
      config.setICRegion(region.rawValue)
      config.setAppID(appId)
      config.setClientSecret(clientSecret)
      self.config = config
      self.user = user
      self.URLBuilder = AppLaunchURLBuilder(config.getICRegion(), config.getAppID(), config.getDeviceID())
      AppLaunchCacheManager.sharedInstance.loadDefaultFeatures(completionHandler)
      IntializeSession()
      //Register User
      registerDevice(completionHandler)
      isInitialized = true
    }
    else{
      completionHandler(nil, AppLaunchFailResponse(.INITIALIZATION_FAILURE, MSG__CLIENT_OR_APPID_NOT_VALID))
    }
    return dfd.promise();
  }

  function _destroy() {
    var dfd = BMSJQ.Deferred();
    return dfd.promise();
  }

  function _isFeatureEnabled(featureCode) {
    return true
  }

  function _getPropertyofFeature(featureCode, propertyCode) {
    return "";
  }

  function _displayInAppMessages() {
  }

  function _sendMetrics(codes) {
  }

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
