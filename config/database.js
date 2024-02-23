const mongoose = require("mongoose");

exports.connectDB = async (mongoURI) => {
  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    //Clear the collection after connecting
    //Note:- Remove this code in future
    const db = mongoose.connection.db;
    await db.collection("users").deleteMany({});
    await db.collection("waitlists").deleteMany({});
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
