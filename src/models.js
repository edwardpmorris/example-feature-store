// Models

// Create classes from JSON schema
// NOTE: if the property is not defined in the schema it is NOT parsed to JSON output
// even when additonalProperties is true
const SchemaModel = require('@chialab/schema-model');

// Set path (relative to this file) to "json-schema"
const json_schema_path = "../json-schema/"

// GeoJSON objects
exports.Geometry = SchemaModel.create( require(json_schema_path + "geometry.schema.json") );

exports.Feature = SchemaModel.create( require(json_schema_path + "feature.schema.json") );

exports.FeatureCollection = SchemaModel.create( require(json_schema_path + "feature-collection.schema.json") );

// Feature store extensions
exports.FeatureStore = SchemaModel.create( require(json_schema_path + "feature-store.schema.json") );

exports.CollectionLookup = SchemaModel.create( require(json_schema_path + "collection-lookup.schema.json") );

exports.CollectionMetaData = SchemaModel.create( require(json_schema_path + "collection-metadata.schema.json") );

exports.PropertyAttributes = SchemaModel.create( require(json_schema_path + "property-attributes.schema.json") );