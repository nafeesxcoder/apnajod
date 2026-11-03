const express = require("express");
const callController = require("../controllers/callController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/ice-servers", callController.getIceServers);
router.get("/incoming", callController.getIncoming);
router.post("/start", callController.startCall);
router.post("/:callId/respond", callController.respondToCall);
router.post("/:callId/end", callController.endCall);
router.get("/:callId/status", callController.getCallStatus);
router.post("/:callId/signal", callController.sendSignal);
router.get("/:callId/signals", callController.pollSignals);

module.exports = router;
