var BMSClient = {
    BMSClientString : "BMSClient",


    /**
     *  Define region constants
     * @type {string}
     */
    REGION_US_SOUTH : ".ng.bluemix.net",
    REGION_UK : ".eu-gb.bluemix.net",
    REGION_SYDNEY : ".au-syd.bluemix.net",

    bmsregion: ".ng.bluemix.net",

    initialize : function(bluemixRegion) {
        bmsregion=bluemixRegion;
    },

    getRegion : function(){
        return bmsregion;
    }


}
