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
    global.ICJQ = D;
    global.ICJQ.Deferred = function () {
      return new Deferred();
    }
  })(window);

  function __IC() {}
  var IC = IC ? IC : {};
  // variables
  var icregion = { 
    US_SOUTH : ".ng.bluemix.net",
    UNITED_KINGDOM : ".eu-gb.bluemix.net",
    SYDNEY : " .au-syd.bluemix.net",
    US_SOUTH_STAGING : ".stage1.ng.bluemix.net",
    UNITED_KINGDOM_STAGING : ".stage1.eu-gb.bluemix.net",
    US_SOUTH_DEV : ".dev.ng.bluemix.net"
  };

  var errorCode = {
    INITIALIZATION_FAILURE: 0,
    REGISTRATION_FAILURE: 1,
    FETCH_ACTIONS_FAILURE: 2,
    DEFAULT_FEATURE_LOAD_FAILURE: 3,
    UNREGISTRATION_FAILURE: 4
  };

  // private methods
  __ICLocalStorageDB = function() {
    /*jshint strict:false, maxparams:4*/

    var appNamePrefix;

    // By Default, we work with localStorage, unless it is changed during a set/get
    var storage = window.localStorage;

     /**
     * Initializes the database and verifies it is accessible
     * @returns {*}
     */
     this.init = function() {
      appNamePrefix = IC.Config.__getApplicationName();
    };

    /**
     * Sets an item in the database
     * @param key
     * @param value
     * @param options {{session : boolean, global : boolean}}
     * @returns {*}
     */
     this.setItem = function(key, value) {
      var finalOptions = initOptions({});
      var finalKey = buildKey(key, finalOptions);
      var finalValue = value ? JSON.stringify(value) : null;
      storage.setItem(finalKey, finalValue);
    };

    /**
     * Gets an item in the database
     * @param key
     * @param options {{session : boolean, global : boolean}}
     * @returns {string - JSON representation of value for given key}
     */
     this.getItem = function(key) {
      var finalOptions = initOptions({});
      var finalKey = buildKey(key, finalOptions);
      var value = storage.getItem(finalKey);
      return value ? JSON.parse(value) : null;
    };

    /**
     * Removes an item in the database
     * @param key
     * @param options {{session : boolean, global : boolean}}
     * @returns {*}
     */
     this.removeItem = function(key) {
      var finalOptions = initOptions({});
      var finalKey = buildKey(key, finalOptions);
      storage.removeItem(finalKey);
    };

    /**
     * Takes the options the user entered (if any) and appends them to the default
     * options, overriding the default values
     * @param userOptions
     * @returns {{global: boolean, session: boolean}}
     */
     function initOptions(userOptions) {
      var options = {
        'session' : false,
        'global' : false
      };
      for (var property in userOptions) {
        options[property] = userOptions[property];
      }

        // Init the storage
        storage = options.session ? window.sessionStorage : window.localStorage;

        return options;
      }

      function buildKey(key, options) {
        return options.global ? key : appNamePrefix + '.' + key;
      }
    };

//+++
IC.LocalStorageDB = new __ICLocalStorageDB();

__ICVarStorageDB = function() {

  var appNamePrefix;
  var storage = {};

  /**
     * Initializes the database and verifies it is accessible
     * @returns {*}
     */
     this.init = function() {
      appNamePrefix = IC.Config.__getApplicationName();
    };

    /**
     * Sets an item in the Database
     * @param key
     * @param value
     * @returns {*}
     */
     this.setItem = function(key, value) {
      var finalKey = buildKey(key);
      var finalValue = value ? JSON.stringify(value) : null;
      storage[finalKey] = finalValue;
    };

    /**
     * Gets an item in the Database
     * @param key
     * @returns {string - JSON representation of value for given key}
     */
     this.getItem = function(key) {
      var finalKey = buildKey(key);
      value = storage[finalKey];
      return value ? JSON.parse(value) : null;
    };

  /**
     * Removes an item in the database
     * @param key
     * @returns {*}
     */
     this.removeItem = function(key) {
      var finalKey = buildKey(key);
      delete storage[finalKey];
    };


   // Builds the key with the appName prefeix
   function buildKey(key) {
    return appNamePrefix + '.' + key;
  }
};


__ICDAO = function() {
  var dao;

  /**
   * Initializes the database and verifies it is accessible
   *
   * @returns {*}
   */
   this.init = function() {
    try {
      dao = new __ICLocalStorageDB();
      dao.init();
      dao.setItem("testKey", "testValue");
      if (dao.getItem("testKey") == "testValue") {
        dao.removeItem("testKey");
      } else {
        throw "LocalStorage Error";
      }
    } catch (e) {
      dao = new __ICVarStorageDB();
      dao.init();
    }
  };

  /**
   * Sets an item in the database
   *
   * @param key
   * @param value
   * @param options
   *            {{session : boolean, global : boolean}} - NOTE: When local storage
   *            is not available (e.g. Safari private mode) all data will be
   *            saved as session storage (regardless of options parameter);
   * @returns {*}
   */
   this.setItem = function(key, value) {
    dao.setItem(key, value);
  }

  /**
   * Gets an item in the database
   *
   * @param key
   * @param options
   *            {{session : boolean, global : boolean}}
   * @returns {value for given key}
   */
   this.getItem = function(key) {
    return dao.getItem(key);
  }

  /**
   * Removes an item in the database
   *
   * @param key
   * @param options
   *            {{session : boolean, global : boolean}}
   * @returns {*}
   */
   this.removeItem = function(key) {
    dao.removeItem(key);
  }
};

//+++
__IC.prototype.DAO = new __ICDAO;
IC.DAO = new __ICDAO;

__ICConfig = function() {
  /*jshint strict:false, maxparams:4*/
  var config;
  var user;
  var URLBuilder;
  var applicationName;
  var applicationRegion;
  var isInitialized = false; //default value

  this.__getConfig= function() {
    return this.config;
  }

  this.__setConfig=function(appConfig) {
    this.config = appConfig;
  }

  this.__getUser= function() {
    return this.user;
  }

  this.__setUser= function(userObj) {
    this.user = userObj;
  }

  this.__getURLBuilder= function() {
    return this.URLBuilder;
  }

  this.__setURLBuilder=function(builder) {
    this.URLBuilder = builder;
  }

  this.__getApplicationName = function() {
    return applicationName;
  };

  this.__setApplicationName = function(app) {
    applicationName = app;
  };

  this.__getApplicationRegion = function() {
    return applicationRegion;
  };

  this.__setApplicationRegion = function(region) {
    applicationRegion = region;
  };

};
IC.Config = new __ICConfig;

__ICUtils = function() {
  this.__IsUserNeedsToBeRegistered = function() {
    if (IC.DAO.getItem("USER_ID") == null && IC.DAO.getItem("DEVICE_ID") == null && IC.DAO.getItem("APP_ID") == null && IC.DAO.getItem("REGION") == null) {
      return true;
    } 
    return false; 
  }

  this.__IsUserNeedsToBeReRegistered = function() {
    if(IC.DAO.getItem("USER_ID") == IC.Config.user.__getUserID() && JSON.stringify(IC.DAO.getItem("ATTRIBUTES")) == JSON.stringify(IC.Config.user.__getAttributes()) && IC.DAO.getItem("DEVICE_ID") == IC.Config.config.__getDeviceID() && IC.DAO.getItem("APP_ID") == IC.Config.__getApplicationName() && IC.DAO.getItem("REGION") == IC.Config.__getApplicationRegion()) {
      return false;
    }
    return true;
  }

  this.__IsUpdateRegistrationRequired = function() {
    if(IC.DAO.getItem("DEVICE_ID") != IC.Config.config.__getDeviceID()) {
      return false;
    }
    if (IC.DAO.getItem("USER_ID") == IC.Config.user.__getUserID() && JSON.stringify(IC.DAO.getItem("ATTRIBUTES")) == JSON.stringify(IC.Config.user.__getAttributes())) {
      return false;
    }
    return true;
  }

  this.__saveUserContext = function() {
    IC.DAO.setItem("USER_ID", IC.Config.user.__getUserID());
    IC.DAO.setItem("DEVICE_ID", IC.Config.config.__getDeviceID());
    IC.DAO.setItem("APP_ID", IC.Config.__getApplicationName());
    IC.DAO.setItem("REGION", IC.Config.__getApplicationRegion());
    IC.DAO.setItem("USER_ID", IC.Config.user.__getUserID());
    if (!IC.Utils.__isEmptyObject(IC.Config.user.__getAttributes())) {
      IC.DAO.setItem("ATTRIBUTES", IC.Config.user.__getAttributes());
    }
  }

  this.__clearUserContext = function() {
    IC.DAO.removeItem("USER_ID");
    IC.DAO.removeItem("DEVICE_ID");
    IC.DAO.removeItem("APP_ID");
    IC.DAO.removeItem("REGION");
    IC.DAO.removeItem("USER_ID");
    IC.DAO.removeItem("ATTRIBUTES");
    IC.DAO.removeItem("FEATURES");
    IC.DAO.removeItem("INAPP");
  }

  this.__getRegistrationData = function() {
    var registrationData = {};
    registrationData.deviceId = IC.Config.config.__getDeviceID();
    registrationData.platform = 'Web';
    registrationData.os = 'Chrome';
    registrationData.userId = IC.Config.user.__getUserID();
    if (!IC.Utils.__isEmptyObject(IC.Config.user.__getAttributes())) {
      registrationData.attributes = IC.Config.user.__getAttributes();
    }
    return registrationData
  }

  this.__getUpdateRegistrationData = function() {
    var registrationData = {};
    registrationData.platform = 'A'
    registrationData.userId = IC.Config.user.__getUserID();
    if (!IC.Utils.__isEmptyObject(IC.Config.user.__getAttributes())) {
      registrationData.attributes = IC.Config.user.__getAttributes();
    }
    return registrationData;
  }

  this.__generateSuccessResponse = function(actions) {
    var response = {};
    response.responseJSON = actions;
    return response;
  }

  this.__generateFailureResponse = function(errorCode, errorMessage) {
    var response = {};
    response.errorCode = errorCode;
    response.errorMessage = errorMessage;
    return response;
  }

  this.__isValidArray = function(array) {
    if(typeof array != "undefined" && array != null && array.length != null && array.length > 0){
      return true;
    }
    return false;
  }

  this.__validateString = function(str) {
    if (typeof str == 'undefined' || !str || str.length === 0 || str === "" || !/[^\s]/.test(str) || /^\s*$/.test(str) || str.replace(/\s/g,"") === "")
    {
      return false;
    }
    return true;
  }

  this.__isEmptyObject = function(obj) {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop))
        return false;
    }
    return JSON.stringify(obj) === JSON.stringify({});
  }
}
IC.Utils = new __ICUtils;

__ICRESTInvoker = function(applaunchURL, applaunchMethod) {
  this.url = applaunchURL;
  this.method = applaunchMethod;
  this.callBack;
  this.json = {};
  this.headers = {};
}

__ICRESTInvoker.prototype = {
  execute : function() {
    var callBack = this.callBack;
    var xmlHttp = new XMLHttpRequest();
      xmlHttp.open(this.method, this.url, true); // true for asynchronous
      xmlHttp.onload = function () {
       callBack(xmlHttp);
     };
     xmlHttp.onerror = function () {
      callBack(xmlHttp);
    };
    for (var key in this.headers) {
      if (this.headers.hasOwnProperty(key)) {
        xmlHttp.setRequestHeader(key,this.headers[key]);
      }
    }
    xmlHttp.send(JSON.stringify(this.json));
  },

  setCallBack : function(value){
    this.callBack = value;
  },

  setJSONRequestBody : function(data) {
    this.json = data;
  },

  addHeader : function (headerName, headerValue) {
    this.headers[headerName] = headerValue;
  }
}

__URLBuilder = function(appLaunchRegion, appLaunchAppID, appLaunchDeviceID) {
  this.baseURL = 'https://applaunch' + appLaunchRegion + '/applaunch/v1'
  this.appID = appLaunchAppID
  this.deviceID = appLaunchDeviceID
}

__URLBuilder.prototype = {
  __getAppRegistrationURL : function(){
    return 'https://mobileservices-dev.us-south.containers.mybluemix.net/applaunch/v1/apps/' + this.appID + '/devices'
  },

  __getUserURL : function() {
    return this.__getAppRegistrationURL() + '/' + this.deviceID
  },

  __getActionURL : function() {
    return this.__getAppRegistrationURL() + '/' + this.deviceID + '/actions'
  },

  __getMetricsURL : function() {
    return this.__getAppRegistrationURL() + '/' + this.deviceID + '/events/metrics'
  },

  __getSessionURL : function() {
    return this.__getAppRegistrationURL() + '/' + this.deviceID + '/events/sessionActivity'
  }
}

__registerDevice = function(dfd) {
  if(!IC.Utils.__IsUserNeedsToBeRegistered() && !IC.Utils.__IsUserNeedsToBeReRegistered()) {
      // User Already Registered, Proceed with getActions Call
      IC.Config.isInitialized = true;
      __getActions(dfd);
    }
    else {
      var method = 'POST';
      var requestURL = IC.Config.__getURLBuilder().__getAppRegistrationURL();
      var registrationData = IC.Utils.__getRegistrationData();
      if (IC.Utils.__IsUpdateRegistrationRequired()) {
        // Update Registration Call
        method = 'PUT'
        requestURL = IC.Config.__getURLBuilder().__getUserURL();
        registrationData = IC.Utils.__getUpdateRegistrationData();
      }
      var request = new __ICRESTInvoker(requestURL, method);
      request.addHeader('Content-Type','application/json; charset = UTF-8');
      request.addHeader('clientSecret', IC.Config.config.__getClientSecret())
      request.setCallBack(function(response) {
        if(response.status == 202) {
          IC.Config.isInitialized = true;
          IC.Utils.__saveUserContext();
          __getActions(dfd);
        } else {
          IC.Config.isInitialized = false;
          IC.Utils.__clearUserContext();
          dfd.reject(IC.Utils.__generateFailureResponse(errorCode.REGISTRATION_FAILURE, response.response));
        }
      });
      request.setJSONRequestBody(registrationData);
      request.execute();
    }
  }

  __getActions = function(dfd) {
    __refreshActions(dfd);
  }

  __refreshActions = function(dfd) {
    var method = 'GET';
    var requestURL = IC.Config.__getURLBuilder().__getActionURL();
    var request = new __ICRESTInvoker(requestURL, method);
    request.addHeader('clientSecret', IC.Config.config.__getClientSecret())
    request.setCallBack(function(data){
      if(data.status == 200) {
        // save actions
        var json = JSON.parse(data.response)
        IC.DAO.setItem("FEATURES", json.features);
        IC.DAO.setItem("INAPP", json.inApp);
        dfd.resolve(IC.Utils.__generateSuccessResponse(json));
      } else {
        dfd.reject(IC.Utils.__generateFailureResponse(errorCode.FETCH_ACTIONS_FAILURE, data.response));
      }
    });
    request.execute();
  }

  function __appLaunchConfig() {
    this.policy = null;
    this.deviceID = null;
    this.cacheExpiration = null;
    this.eventFlushInterval = null;
    this.clientSecret = null;

    this.__getPolicy= function() {
      return this.policy;
    }

    this.__getDeviceID= function() {
      return this.deviceID;
    }

    this.__getCacheExpiration= function() {
      return this.cacheExpiration;
    }

    this.__getEventFlushInterval= function() {
      return this.eventFlushInterval;
    }

    this.__getClientSecret= function() {
      return this.clientSecret;
    }
  };

  var __appLaunchConfigBuilder = function() {
    this.policy = null;
    this.appDeviceID = null;
    this.appCacheExpiration = 30;
    this.appEventFlushInterval = 30;

    this.fetchPolicy = function(refreshPolicy) {
      this.policy = refreshPolicy;
      return this;
    }
    this.cacheExpiration = function(cacheExpiration) {
      this.appCacheExpiration = cacheExpiration;
      return this;
    }
    this.eventFlushInterval = function(eventFlushInterval) {
      this.appEventFlushInterval = eventFlushInterval;
      return this;
    }
    this.deviceID = function(deviceID) {
      this.appDeviceID = deviceID;
      return this;
    }
    this.build = function() {
      var config = new __appLaunchConfig();
      config.policy = this.policy;
      config.deviceID = this.appDeviceID;
      config.cacheExpiration = this.appCacheExpiration;
      config.eventFlushInterval = this.appEventFlushInterval;
      return config
    }
  };

  function __appLaunchUser() {
    this.userID = null;
    this.attributes = {};

    this.__getUserID= function() {
      return this.userID;
    }

    this.__getAttributes= function() {
      return this.attributes;
    }
  };

  var __appLaunchUserBuilder = function() {
    this.appUserID = null;
    this.attribute = {};

    this.userID = function(username) {
      this.appUserID = username;
      return this;
    }

    this.attributes = function(headerKey, headerValue) {
      this.attribute[headerKey] = headerValue;
      return this;
    }

    this.build = function() {
      var user = new __appLaunchUser();
      user.userID = this.appUserID;
      user.attributes = this.attribute;
      return user;
    }
  };

  function __initialize(ICRegion, appGUID, clientSecret, appLaunchConfig, appLaunchUser) {
    var dfd = ICJQ.Deferred();
    if(IC.Utils.__validateString(ICRegion) && IC.Utils.__validateString(appGUID) && IC.Utils.__validateString(clientSecret) && IC.Utils.__validateString(appLaunchUser.userID)) {
      var builder = new __URLBuilder(ICRegion, appGUID, appLaunchConfig.__getDeviceID());
      appLaunchConfig.clientSecret = clientSecret;
      IC.Config.__setConfig(appLaunchConfig);
      IC.Config.__setUser(appLaunchUser);
      IC.Config.__setURLBuilder(builder);
      IC.Config.__setApplicationName(appGUID);
      IC.Config.__setApplicationRegion(ICRegion);
      IC.DAO.init();
      __registerDevice(dfd);
    } else {
      dfd.reject(IC.Utils.__generateFailureResponse(errorCode.INITIALIZATION_FAILURE,'AppLaunch is not Initialized'));
    }
    return dfd.promise();
  }

  function _destroy() {
    var dfd = ICJQ.Deferred();
    return dfd.promise();
  }

  function __isFeatureEnabled(featureCode) {
    if(IC.Config.isInitialized) {
      var ICAppLaunchFeatures = IC.DAO.getItem("FEATURES");
      for (var i = 0; i < ICAppLaunchFeatures.length; i++) {
        if(ICAppLaunchFeatures[i].code == featureCode)
          return true;
      }
    }
    return false;
  }

  function __getPropertyofFeature(featureCode, propertyCode) {
    if(IC.Config.isInitialized) {
      var ICAppLaunchFeatures = IC.DAO.getItem("FEATURES");
      for (var i = 0; i < ICAppLaunchFeatures.length; i++) {
        if(ICAppLaunchFeatures[i].code == featureCode) {
          var properties = ICAppLaunchFeatures[i].properties
          for (var j=0; j < properties.length; j++) {
            if(properties[j].code == propertyCode) {
              return properties[j].value
            }
          }
        }
      }
    }
    return "";
  }

  function _displayInAppMessages() {
  }

  function __sendMetrics(codes) {
    if(IC.Config.isInitialized) {
      if(IC.Utils.__isValidArray(codes)) {
        var method = 'POST';
        var requestURL = IC.Config.__getURLBuilder().__getMetricsURL();
        var metricsData = {};
        metricsData.metricCodes = codes;
        var request = new __ICRESTInvoker(requestURL, method);
        request.addHeader('Content-Type','application/json; charset = UTF-8');
        request.addHeader('clientSecret', IC.Config.config.__getClientSecret());
        request.setCallBack(function(response) {
          if(response.status == 202) {
           console.log("sent metrics successfully for the code(s) : " + codes.toString());
         } else {
          console.log("Error in sending metrics for the code(s) : " + codes.toString());
        }
      });
        request.setJSONRequestBody(metricsData);
        request.execute();
      }
      else {
        console.log("Metric codes is not an valid array/empty")
      }
    } else {
      console.log("AppLaunch is not Initialized");
    }
  }

  // exposed public method
  return {
    initialize: __initialize,
    ICRegion: icregion,
    destroy: _destroy,
    AppLaunchConfigBuilder: __appLaunchConfigBuilder,
    AppLaunchUserBuilder: __appLaunchUserBuilder,
    sendMetrics: __sendMetrics,
    isFeatureEnabled: __isFeatureEnabled,
    getPropertyofFeature: __getPropertyofFeature,
    displayInAppMessages: _displayInAppMessages
  }
}));
