const mongoose = require("mongoose");

exports.connectDB = async (mongoURI) => {
  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    //Clear the collection after connecting
    //Note:- Remove this code in future
    const db = mongoose.connection.db;
    const data = await db.collection("users").deleteMany({});
    console.log(data);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
