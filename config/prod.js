export default {
  dbURL: process.env.MONGO_URL || 'mongodb+srv://team:1234@cluster0.bhmqa.mongodb.net/',
  dbName : process.env.DB_NAME || 'GroovifyDB'
}
