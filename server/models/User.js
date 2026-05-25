// Import bcryptjs so we can safely hash passwords and compare password hashes.
import bcrypt from "bcryptjs";

// Import mongoose so we can define a schema and create a MongoDB model.
import mongoose from "mongoose";

// A schema describes the shape of documents inside a MongoDB collection.
const userSchema = new mongoose.Schema({
  // Store the user's display name.
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },

  // Store the user's email address.
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // Store the user's password as a hash, not as plain text.
  password: {
    type: String,
    required: true,
    minlength: 6,

    // select: false means Mongoose will not include this field in normal query results.
    // We use this for passwords so the hash is not accidentally sent back from controllers.
    select: false,
  },

  // Store the user's preferred currency for displaying expenses.
  currency: {
    type: String,
    default: "INR",
    enum: ["INR", "USD", "EUR", "GBP"],
  },

  // Store the family relation
  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Family",
    default: null,
  },

  // Store the role of user in the family
  familyRole: {
    type: String,
    enum: ["admin", "member", null],
    default: null,
  },

  // Store when the user document was created.
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// A pre-save hook is middleware that runs before a document is saved to MongoDB.
// This is the right place to hash a password because it catches both new users and password changes.
userSchema.pre("save", async function () {
  // Only hash the password if it is new or has been changed.
  // Without this check, saving an existing user would hash the already-hashed password again,
  // which would make the user's real password stop matching during login.
  if (!this.isModified("password")) {
    return;
  }

  // A salt is random extra data added before hashing so identical passwords get different hashes.
  const salt = await bcrypt.genSalt(10);

  // bcrypt combines the plain password with the salt, then produces a one-way hash.
  // A one-way hash can be checked later, but it should not be converted back to the original password.
  this.password = await bcrypt.hash(this.password, salt);
});

// An instance method is a function available on each User document.
// Keeping password comparison here avoids repeating bcrypt logic in every controller that needs login.
userSchema.methods.matchPassword = async function (enteredPassword) {
  // We cannot compare strings directly because the database stores a bcrypt hash, not the plain password.
  // bcrypt.compare hashes the entered password in a compatible way and checks it against the stored hash.
  return bcrypt.compare(enteredPassword, this.password);
};

// Create the User model from the schema so the app can create and query users.
const User = mongoose.model("User", userSchema);

// Export the model so controllers and routes can import it later.
export default User;
