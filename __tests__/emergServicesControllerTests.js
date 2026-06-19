jest.mock("../model/emergServicesModel", () => ({
  findClosestService: jest.fn()
}));

const EmergServicesController = require("../controller/emergServicesController");
const EmergencyServices = require("../model/emergServicesModel");
const errorHandler = require("../middleware/errorHandler");

describe("Emergency services controller", () => {
  let req;
  let res;

  const invokeController = async (handler) => {
    try {
      await handler();
    } catch (error) {
      errorHandler(error, req, res, jest.fn());
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it("returns 400 when h3Index is missing", async () => {
    await invokeController(() => EmergServicesController.getClosest(req, res));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Bad request",
      message: "H3 index is required"
    });
  });

  it("returns the closest emergency services for a valid h3Index", async () => {
    const services = {
      police: { name: "Police A", type: "police", h3: "abc" },
      hospital: { name: "Hospital A", type: "NHS Hospital", h3: "def" }
    };
    req.query.h3Index = "8928308280fffff";
    EmergencyServices.findClosestService.mockResolvedValue(services);

    await invokeController(() => EmergServicesController.getClosest(req, res));

    expect(EmergencyServices.findClosestService).toHaveBeenCalledWith("8928308280fffff");
    expect(res.json).toHaveBeenCalledWith({
      h3Index: "8928308280fffff",
      services
    });
  });
});
