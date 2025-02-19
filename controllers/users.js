const Users = require("../repository/users");
const jwt = require("jsonwebtoken");
const path = require("path");
const { HttpCode } = require("../config/constants");
const UploadService = require("../services/file-upload");
const mkdirp = require("mkdirp");
require("dotenv").config();
const SECRET_KEY = process.env.JWT_SECRET_KEY;

const registration = async (req, res, next) => {
  const { name, email, password, subscription } = req.body;
  const user = await Users.findByEmail(email);
  if (user) {
    return res.status(HttpCode.CONFLICT).json({
      status: "Error",
      code: HttpCode.CONFLICT,
      message: "Email is already use",
    });
  }
  try {
    const newUser = await Users.create({ name, email, password, subscription });
    return res.status(HttpCode.CREATED).json({
      status: "Success",
      code: HttpCode.CREATED,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        subscription: newUser.subscription,
        avatar: newUser.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await Users.findByEmail(email);
  const isValidPassword = await user.isValidPassword(password);
  if (!user || !isValidPassword) {
    return res.status(HttpCode.UNAUTHORIZED).json({
      status: "Error",
      code: HttpCode.UNAUTHORIZED,
      message: "Invalid credentials",
    });
  }
  const id = user._id;
  const payload = { id };
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "10h" });
  await Users.updateToken(id, token);
  return res.status(HttpCode.OK).json({
    status: "Success",
    code: HttpCode.OK,
    date: { token },
  });
};

const logout = async (req, res, next) => {
  const id = req.user._id;
  await Users.updateToken(id, null);
  return res.status(HttpCode.NO_CONTENT).json({});
};

const uploadAvatar = async (req, res, next) => {
  const id = String(req.user._id);
  const file = req.file;
  const AVATAR_OF_USERS = process.env.AVATAR_OF_USERS;
  const destination = path.join(AVATAR_OF_USERS, id);
  await mkdirp(destination);
  const uploadService = new UploadService(destination);
  const avatarUrl = await uploadService.save(file, id);
  await Users.updateAvatar(id, avatarUrl);

  return res.status(HttpCode.OK).json({
    status: "Success",
    code: HttpCode.OK,
    date: { avatar: avatarUrl },
  });
};

const getUser = async (req, res, next) => {
  const { name, email, subscription } = req.user;
  return res
    .status(200)
    .json({ message: "Success", name, email, subscription });
};

module.exports = {
  registration,
  login,
  logout,
  uploadAvatar,
  getUser,
};
