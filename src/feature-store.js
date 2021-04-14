/////////////////////////////////////////////////
// PACKAGES
/////////////////////////////////////////////////

// Console view defaultOptions
const util = require('util');
// Set maximum view of arrays to 5
util.inspect.defaultOptions.maxArrayLength = 3;

// Progress bars in console
// https://www.npmjs.com/package/nqdm
const nqdm = require("nqdm")

// Create UUID v4
// https://github.com/uuidjs/uuid
const { v4: uuidv4 } = require('uuid');

// Create object hask
var hash = require('object-hash');

// Selectively extract data from JSON documents (and JavaScript objects)
// https://github.com/JSONPath-Plus/JSONPath
const { JSONPath } = require('jsonpath-plus');

// Set and get values via object path
// see https://github.com/mariocasciaro/object-path
//const objectPath = require('object-path')
const immutable = require('object-path-immutable')

// Select fields from object (without changing structure)
// https://github.com/nemtsov/json-mask
const mask = require('json-mask');

// Reduce GeoJSON precision
// https://github.com/jczaplew/geojson-precision
const gp = require("geojson-precision");

// Fix Polygon cooordinate order
// https://github.com/mapbox/geojson-rewind
const rewind = require("@mapbox/geojson-rewind");

// Add bounding box to geojson
// https://github.com/mapbox/geojson-extent
const geojsonExtent = require('geojson-extent');

// File system i/o
const fileio = require("../src/file-io.js");

// Obkject Classes (models) from JSON schema
const models = require("../src/models.js")

/////////////////////////////////////////////////
// UTILITIES
/////////////////////////////////////////////////

/**
 * Create universal unique identifier (RFC4122)
 * 
 * @returns {string} A RFC4122 version 4 random UUID
 */

function createUUID() { return uuidv4(); }

/**
 * Create 128 bit MD5 hash code
 * 
 * @params {object} obj Object to generate hash from 
 * 
 * @returns {string} A 128 bit MD5 hash
 */

function createMD5Hash(obj) { return hash(obj, { algorithm: 'md5' }); }

/**
 * Set the cooordinate precision of a GeoJSON object
 * 
 * @param {object} geojson GeoJSON FeatureCollection, Feature or Geometry
 * @param {integer} [precision=6] Number of decimal places to set coordiates
 
 * @returns {object} GeoJSON object with the specified coordinate precision
 */

function setGeoJSONPrecision(geojson, precision = 6) { return gp.parse(geojson, precision) }

/**
 * Set the cooordinate order of a GeoJSON (Multi)Polygon object
 * 
 * @param {object} geojson GeoJSON FeatureCollection, Feature or Geometry
 * 
 * @returns {object} GeoJSON object with inner and outer rings of different winding orders, and outer ring clockwise.
 */

function setGeoJSONOrder(geojson) { return rewind(geojson, true) }

/**
 *  Select specific parts of a JS object
 * 
 * @param {object} obj Object to select from
 * @param {string} properties Properties to select from the object, see https://github.com/nemtsov/json-mask
 * 
 * @returns {object} Object (with same structure as original) with the selected fields
 */

function select(obj, properties) { return mask(obj, properties) }

/**
 *  Set a value within a JS object
 * 
 * @param {object} obj Object to set value in
 * @param {string} property_path Property path, e.g. for {"level1":{level2: 0}} use ["level1","level2"]
 * @param {any} value The value to set

 * 
 * @returns {object}  Object with value set
 */

function setValue(obj, property_path, value) {
    return immutable.set(obj, property_path, value)
}

function findConcatValues(a, q, property_path, values)
{
  var i = a.findIndex(e => e[Object.keys(q)[0]] === Object.values(q)[0])
  var p = i + "." + property_path
  var v = getValue(a, p)
  return immutable.update(a, p, v => v.concat(values))
  }
//console.log("\nTest findSetValue:", findConcatValues([{id:"1", "features": ["1"]},{id:"2", "features": ["2"]}], {"id":"2"}, "features", ["3"]))

/**
 *  Get a value from a JS object
 * 
 * @param {object} obj Object to get value in
 * @param {string} property_path Property path e.g. for {"level1":{level2: 0}} use ["level1","level2"]
 * 
 * @returns {any}  The selected value or null
 */

function getValue(obj, property_path) { return immutable.get(obj, property_path, null) }

/**
 *  Get an array of values from an array of JS objects
 * 
 * @param {object} obj Object to get values from
 * @param {string} property_path Property path (JSONpath), e.g. "$.feature_collections"
 * @param {string} key Property key to select from each object
 * 
 * @returns {any}  The selected values or null
 */

function getValues(obj, property_path, key) {
    p = property_path + "[*]." + key
    return JSONPath({path:p, json:obj, wrap:true})
}
//console.log("Test getValues", getValues({feature_collections: [{id: "1"}, {id: "2"}]},"$.feature_collections", "id"))

/////////////////////////////////////////////////
// SUMMARISE
/////////////////////////////////////////////////

models.FeatureStore.prototype.summarise = function (){
  console.group("\nFeatureStore summary:")
  console.log("- root_path:", getValue(this, "store.root_path"))
  console.group("FeatureCollections:")
  const fc = getValue(this, "feature_collections")
  console.dir(fc)
  console.log("\n")
  console.groupEnd();
  console.groupEnd();
}

/////////////////////////////////////////////////
// READ/QUERY
/////////////////////////////////////////////////

function buildQuery(object) {
    //"$..*[?(@.iso === 'BRA' && @.type === 'country')].fid"
    out = []
    for (const property in object) { out.push(`@.${property} === '${object[property]}'`) }
    return "$..*[?(" + out.join(' && ') + ")]"
}

readFeatureStore = function(store_path = './fstore') {
    const fs_path = store_path + "/" + ".fstore.json"
    console.time("- read_time");
    const json = fileio.readLocalSync(fs_path)
    //console.log(json)
    const out = new models.FeatureStore(json)
    console.group("- reading FeatureStore:", fs_path)
    console.timeEnd("- read_time")
    out.summarise()
    console.groupEnd();
    return out
}
exports.readFeatureStore = readFeatureStore

models.FeatureStore.prototype.readFeatureCollection = function (fcid) {
    const fstore = readFeatureStore(this.store.root_path)
    console.time("- read_time");
    console.group("- reading FeatureCollection:", fcid)
    const p = buildQuery({id:fcid})
    const fc = JSONPath({path:p,json:fstore, wrap:false})[0]
    const out = new models.FeatureCollection(fc)
    console.timeEnd("- read_time")
    console.groupEnd();
    return out
}

models.FeatureStore.prototype.readGeometry = function (fcid, fid) {
    console.time("- read_time");
    const g_path = this.store.root_path + "/" + fcid + "/geometries/" + fid + ".geojson.json"
    console.group("- reading Geometry", fid)
    const out = new models.Geometry(fileio.readLocalSync(g_path))
    console.timeEnd("- read_time")
    console.groupEnd();
    return out
}

models.FeatureStore.prototype.readFeature = function (fcid, fid, include_geometry = false) {
    console.time("- read_time");
    const f_path = this.store.root_path + "/" + fcid + "/features/" + fid + ".geojson.json"
    console.group("- reading Feature", fid)
    var out = new models.Feature(fileio.readLocalSync(f_path))
    console.timeEnd("- read_time")
    console.groupEnd();
    if (include_geometry === true) {
        const g = this.readGeometry(fcid, fid)
        out = setValue(out, "geometry", g)
    }
    return out
}

models.FeatureStore.prototype.queryFeatureCollection = function (fcid, json, include_features=false, include_geometry = false) {
    console.time("- query_time");
    console.group("\nQuery FeatureCollection:\n");
    // Read FeatureCollection (Lookup) from file
    var fc = this.readFeatureCollection(fcid)
    // Build query
    const path = buildQuery(json)
    console.log("- querying", fcid, "with", path)
    // Return collection lookup Features (index properties)
    var out = JSONPath({ path: path, json: fc })
    console.group("\nQuery results:")
    console.log(out, "\n")
    console.groupEnd()
    if(include_features===true){
      out = out.map(function(clf){return this.readFeature(fcid, clf.fid, include_geometry)}, this)}
    console.timeEnd("- query_time");
    console.groupEnd();
    return(out)
}


//models.FeatureStore.prototype.readCollectionLookup = function (fcid) {
//    const fc_path = this.store_path + "/" + fcid + "/" + fcid + ".geojson.json"
//    console.log("\nReading ", fc_path, "...\n")
//    const fc = new models.FeatureCollection(fileio.readLocalSync(fc_path))
//    const out = getValue("features.0.properties.collection_lookup", fc)
//    return out
//}



models.FeatureStore.prototype.readFeatures = function (fcid, fids, include_geometry = false) {
    return fids.map(function (fid) {
        return this.readFeature(fcid, fid.fid, include_geometry)
    }, this)
}



models.FeatureStore.prototype.readGeometries = function (fcid, fids) {
    return fids.map(function (fid) {
        return this.readGeometry(fcid, fid.fid)
    }, this)
}

/////////////////////////////////////////////////
// CREATE
/////////////////////////////////////////////////

/**
 *  Create a FeatureStore object 
 * 
 * @param {!string} store_path Path of the Feature store
 * 
 * @returns {Object} A feature store object, also a directory is created at store_path, and .fstore.json under path 
 */

exports.createFeatureStore = function (store_path = './fstore') {
    console.group("\nCreating FeatureStore:");
    console.time("- process_time");
    // Ensure fstore does not exists, else create it
    if (fileio.existsLocalSync(store_path)) {

        console.log("- store_path already exists! Attempting to returning the existing FeatureStore.");

        //Read existing fstore
        var fstore = readFeatureStore(store_path)

    } else {

        // Create local directory
        console.log("- making feature store at", store_path, "...")
        fileio.mkdirLocalSync(store_path);
        
        // Create FeatureStore object
        var fstore = new models.FeatureStore({
            "store": { "root_path": store_path },
            "feature_collections": []
        })
        console.log("- created feature store object:", fstore)

        

        // Write fstore to file
        console.log("- writing fstore config to ", store_path + "/.fstore.json ...")
        fileio.writeLocalSync(store_path + "/.fstore.json", fstore); 
    }
    // Always return a FeatureStore object
    console.timeEnd("- process_time");
    console.groupEnd();
    return fstore
};

/**
 *  Create a CollectionMetaData object
 * 
 * @param {!Object} obj Object that describes the FeatureCollection,:
 *  {
            "name": {!string} Name of the FeatureCollection, used for display,
            "license": {string} String or URL describing license of FeatureCollection,
            "url": {string} URL with more information describing the FeatureCollection,
            "version": {string} version of the FeatureCollection, preferably using semantic versioning form ("1.0.0"), used for display.
            "keywords": {Array<string>} Array of keywords describing the FeatureCollection,
            "description": {string} Short description, used for display,
            "language": {string} Main language of FeatureCollection, e.g., "en",
            "altName": {string} Alternative (short) name,
            "citation": {string} Citation for the FeatureCollection,
            "spatialCoverage": {string} Text describing geographical coverage, e.g., "Global land",
            "temporalCoverage": {string} Text describing temporal coverage, e.g.,"approx. 2018",
            "dataLineage": {Array<string>} Array of short statements describing the processing history of the FeatureCollection, e.g., "Dataset was downloaded from https://gadm.org as SHP files and converted to GeoJSON."
        }
 * 
 * @returns {object} CollectionMetaData object
 */

exports.createCollectionMetaData = function (obj) {
    out = new models.CollectionMetaData(obj)
    console.group("\nCreating CollectionMetaData object:")
    console.log(out.toJSON(), "\n")
    console.groupEnd()
    return out;
}

/**
 *  Create a PropertyAttributes object
 * 
 * @param {object} obj Object that describes the attributes of the properties in a Feature, required properties:
 *  {
    "short_name": {string} name of the property used in the Feature,
    "standard_name": {string} CF-standard style name, e.g., mean_mass_density_of_carbon_in_mangroves,
    "units": {string} UDunits style describing units, e.g., g/m2, if no units use "1",
    "long_name": {string} Human-readable name, suitable for display, e.g., "Mean mangrove carbon density",
    "description": {string} Short description about the property,
    "missing_value": {string|number|integer|null} Value that represents missing values,
    "data_type": {string} The JS data type,
    "url": {string} URL giving more information about the property
    }
 * 
 * @returns {object} PropertyAttributes object
 */

createPropertyAttributes = function (obj) {
    out = new models.PropertyAttributes(obj)
    console.group("\nCreating PropertyAttributes object:")
    console.log(out.toJSON(), "\n")
    console.groupEnd()
    return out;
}
exports.createPropertyAttributes = createPropertyAttributes

// Define default property attributes (used when adding Features to FeatureStore)
const defaultPropertyAttributes = [
    // FID
    createPropertyAttributes({
        "short_name": "fid",
        "standard_name": "unique_identifer_of_feature",
        "units": "1",
        "long_name": "Feature identifier",
        "description": "The universally unique identifier (UUID) of the Feature and Geometry",
        "missing_value": null,
        "data_type": "string",
        "url": "https://en.wikipedia.org/wiki/Universally_unique_identifier"
    }),
    // Properties object hash
    createPropertyAttributes({
        "short_name": "prop_hash",
        "standard_name": "md5_128_hash_of_properties",
        "units": "1",
        "long_name": "Properties MD5 hash",
        "description": "A 128 bit MD5 hash identifier created from the Feature properties (excluding geom_hash)",
        "missing_value": null,
        "data_type": "string",
        "url": "https://en.wikipedia.org/wiki/md5"
    }),
    createPropertyAttributes({
        "short_name": "geom_hash",
        "standard_name": "md5_128_hash_of_geometry",
        "units": "1",
        "long_name": "Geometry MD5 hash",
        "description": "A 128 bit MD5 hash identifier of the Feature Geometry",
        "missing_value": null,
        "data_type": "string",
        "url": "https://en.wikipedia.org/wiki/md5"
    })]

/**
 * Create a FeatureCollection in a featureStore
 * 
 * @param {!Object} this FeatureStore object
 * @param {string} fcid Feature collection identifier, e.g., "my-feature-collection"
 * @param {?Object} collection_metadata CollectionMetaData object   
 * @param {?Array<Object>} property_attributes Array of PropertyAttribute objects
 * 
 * @returns {Object} Updated featureStore object, also creates directory under store.root_path and write to file .fstore
 */

models.FeatureStore.prototype.createFeatureCollection = function (fcid, collection_metadata = null, property_attributes = null) {
    
    console.group("\nCreating FeatureCollection:");
    console.time("- process_time");
    
    // ALWAYS read .fstore to keep in sync!
    var fstore = readFeatureStore(this.store.root_path)
    
    
    // Get existing feature_collections from fstore
    const feature_collections = getValue(fstore, "feature_collections")
    const feature_collection_ids = getValues(feature_collections, "$", "id")

    // Check if given fcid exists in fstore, if true return error else create FeatureCollection
    if (feature_collection_ids.includes(fcid)) {

        console.log("- fcid already exists! Attempting to return the existing FeatureCollection.");

    } else {

        // Create local FeatureCollection directory 
        const collection_dir = fstore.store.root_path + '/' + fcid;
        console.log("- making FeatureCollection at ", collection_dir)
        fileio.mkdirLocalSync(collection_dir);

        // Create local features and geometries directories
        console.log("- making features and geometries directories")
        fileio.mkdirLocalSync(collection_dir + '/features');
        fileio.mkdirLocalSync(collection_dir + '/geometries');

        // Add array of feature PropertyAttributes to defaultPropertyAttributes array
        if (property_attributes===null){property_attributes=[]}
        pa = defaultPropertyAttributes.concat(property_attributes)

        // Create FeatureCollection object (with empty features)
        const fc = new models.FeatureCollection(
            {
                "type": "FeatureCollection",
                "id": fcid,
                "collection_metadata": collection_metadata,
                "property_attributes": pa,
                "features": []
            })
        //console.log(fc)
        // Update .fstore
        var new_fcs = feature_collections.concat([fc])
        //console.log(new_fcs)
        fstore.set({"feature_collections": new_fcs})
        
        // Write fstore to file
        console.log("- updating fstore config ", fstore.store.root_path + "/.fstore.json")
        fileio.writeLocalSync(fstore.store.root_path + "/.fstore.json", fstore);
    }
    
    // Return the updated FeatureStore object
    fstore.summarise()
    console.timeEnd("- process_time");
    console.groupEnd();
    return fstore
}

/**
 * Create a Feature in a FeatureCollection within a FeatureStore
 * 
 * @param {!Object} this FeatureStore object
 * @param {!string} fcid FeatureCollection identifier, e.g., "my-feature-collection"
 * @param {!Object} properties Properties object
 * @param {?Object} geometry Geometry object
 * @param {?Array<string>} index_names Array of property names used for indexing the Feature within the FeatureCollection
 * @param {?integer=6} coord_precision Coordinate precision to round the input Geometry too
 * 
 * @returns {Object} A collection lookup Feature, a Feature with only index properties, no geometry. 
 * Also the Feature with no geometry is written to file at <store.root_path>/<fcid>/features/<fid>.geojson.json
 * and the Geometry is written to file at <store.root_path>/<fcid>/geometries/<fid>.geojson.json   
 */

models.FeatureStore.prototype.createFeature = function (fcid, properties, geometry = null, index_names = null, coord_precision = 6) {

    // Get FeatureCollection directory 
    const collection_dir = this.store.root_path + '/' + fcid;

    // Create Feature UUID
    const fid = createUUID()
    
    // Create properties MD5 hash fingerprint
    // ALWAYS before adding properties
    const prop_hash = createMD5Hash(properties)
    var p = setValue(properties, "prop_hash", prop_hash)
    p = setValue(p, "fid", fid)

    // Create Feature
    var f = new models.Feature({
        "type": "Feature",
        "id": fid,
        "geometry": null,
        "properties": p
    })

    // If Geometry, validate, set coordinate precision,
    // create hash fingerprint calculate bbox, and write to file 
    if (geometry !== null) {

        // Create Geometry object (validate)
        var g = new models.Geometry(geometry)

        // Set coordinate precision of geometry
        g = setGeoJSONPrecision(g, coord_precision)

        // Set coordinate order of geometry
        g = setGeoJSONOrder(g)

        // Create Geometry MD5 hash fingerprint (after pre- processing steps!!)
        f = setValue(f, "properties.geom_hash", createMD5Hash(g))

        // Create bbox object
        f = setValue(f, "bbox", geojsonExtent(g))

        // Write Geometry with FID as filename
        // TODO: should filename be geo_hash?
        const geometry_path = collection_dir + '/geometries/' + fid + '.geojson.json'
        //console.log("\nWriting Geometry to ", geometry_path)
        fileio.writeLocalSync(geometry_path, g);
    }
    //console.log("\ndebug f:", f)

    // Write Feature to file
    const feature_path = collection_dir + '/features/' + fid + '.geojson.json'
    //console.log("\nWriting Feature to ", feature_path)
    fileio.writeLocalSync(feature_path, f);

    // Create a collection lookup Feature (a Feature with only index properties)
    if (index_names == null) {
        var fields = 'type,id,geometry,properties(fid,prop_hash,geom_hash)'
    } else {
        var fields = 'type,id,geometry,properties(fid,prop_hash,geom_hash,' + index_names.join(",") + ')'
    }
    const clf = select(f, fields);
    //console.log("debug clf:", clf)

    // Return the collection lookup Feature
    return clf
}

/**
 * Create Features from GeoJSON in a FeatureCollection within a FeatureStore
 * 
 * @param {!Object} this FeatureStore object
 * @param {!string} fcid FeatureCollection identifier, e.g., "my-feature-collection"
 * @param {!Object} geojson GeoJSON FeatureCollection, Feature or Geometry object 
 * @param {?Array<string>} index_names Array of property names used for indexing the Feature within the FeatureCollection
 * 
 * @returns
 */

models.FeatureStore.prototype.createFeaturesFromGeoJSON = function (fcid, geojson, index_names = null) {

  console.group("\nAdd Features to FeatureCollection from GeoJSON:");
  console.time("- process_time");
    
    // ALWAYS read to keep in sync
    var fstore = readFeatureStore(this.store.root_path)
    //console.log("debug initial fstore:", fstore )

    // Get GeoJSON type
    console.log("- geoJSON type is", geojson.type)

    // Process depending on type (TODO: change to switch?)
    // Only creates collection lookup Feature array
    if (geojson.type === "Geometry") {
        var properties = {}
        var clfs = [this.createFeature(fcid, properties, geojson, index_names = undefined)]

    }
    if (geojson.type === "Feature") {
        var clfs = [this.createFeature(fcid, geojson.properties, geojson.geometry, index_names)]

    }
    if (geojson.type === "FeatureCollection") {
        geojson = new models.FeatureCollection(geojson)
        var features = geojson.features
        // Add to file store and array of create collection lookup Features
        console.group("- adding Features to FeatureCollection")
        var clfs = []
        for (const f of nqdm(features)) {
          var clf = this.createFeature(fcid, f.properties, f.geometry, index_names);
          clfs.push(clf)
        }
        //console.log("debug:", clfs)
        console.groupEnd();
    }
    
    // Update the stores FeatureCollection collection lookup Features
    // Update .fstore
    var new_fcs = findConcatValues(fstore.feature_collections,{id:fcid}, "features", clfs)
    //console.log(new_fcs)
    fstore.set({"feature_collections": new_fcs})
    
    // Write fstore to file
    console.log("- updating fstore config ", fstore.store.root_path + "/.fstore.json")
    //console.log('\ndebug final fstore: ', this.toJSON())
    fileio.writeLocalSync(fstore.store.root_path + "/.fstore.json", fstore);

    // Return the updated FeatureStore object
    fstore.summarise()
    console.timeEnd("- process_time");
    console.groupEnd();
    return fstore
    
}


/////////////////////////////////////////////////
// UPDATE
/////////////////////////////////////////////////

models.FeatureStore.prototype.updateFeatureCollection = function (fcid, property_path, value) {

    // Read FeatureCollection from file
    var fc = this.readFeatureCollection(fcid)

    // Get collection_path
    const collection_path = getValue("features.0.properties.collection_path", fc)

    // Set properties
    setValue(property_path, value, fc);
    //console.log("debug: ", getValue("features.0.properties", fc))

    // Check if valid FeatureCollection
    fc = new models.FeatureCollection(fc)

    // Write FeatureCollection to file
    console.log("Writing FeatureCollection to ", collection_path);
    fileio.writeLocalSync(collection_path, fc);
    //return fc
}

/////////////////////////////////////////////////
// QUERY
/////////////////////////////////////////////////

function buildQuery(object) {
    //"$..*[?(@.iso === 'BRA' && @.type === 'country')].fid"
    out = []
    for (const property in object) { out.push(`@.${property} === '${object[property]}'`) }
    return "$..*[?(" + out.join(' && ') + ")]"
}
models.FeatureStore.prototype.queryCollectionLookup = function (fcid, json) {
    // Read CollectionLookup from file
    var lu = this.readFeatureCollection(fcid)
    // Build query
    const path = buildQuery(json)
    console.log("Querying", fcid, "with", path)
    // Return FIDs
    return JSONPath({ path: path, json: lu })
}