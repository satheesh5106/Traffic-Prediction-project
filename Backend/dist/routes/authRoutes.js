"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// Public routes
router.post('/login', (0, errorHandler_1.asyncHandler)(authController_1.login));
router.post('/register', (0, errorHandler_1.asyncHandler)(authController_1.register));
// Protected routes
router.get('/profile', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(authController_1.getProfile));
router.put('/profile', authMiddleware_1.protect, (0, errorHandler_1.asyncHandler)(authController_1.updateProfile));
exports.default = router;
//# sourceMappingURL=authRoutes.js.map