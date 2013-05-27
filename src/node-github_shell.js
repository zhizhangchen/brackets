function doJsoConfigure(url) {
    jso_configure({
        "github" :{
            client_id: "461a47b142a0daac99bd",
            authorization: url, 
            scope : ["repo", "user"],
            isDefault : true
        },
    });
}
