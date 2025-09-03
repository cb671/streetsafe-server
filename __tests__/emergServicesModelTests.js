//Set up
const EmergencyServices = require("../model/emergServicesModel");
const db = require("../database/connect");
const h3 = require("h3-js");

jest.mock("../database/connect");
jest.mock("h3-js");


//Model Tests
describe("EmergencyServices.findClosestService", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it("returns the closest police and hospital", async () => {
      // mock h3 functions
      h3.h3ToParent.mockImplementation((h3Index, resolution) => h3Index + "-norm");
      h3.h3Distance.mockImplementation((a, b) => {
        if (b.includes("1")) return 1;
        return 5;
      });
  
      // mock db results
      db.query.mockResolvedValue({
        rows: [
          { name: "Police A", type: "police", h3: "cell1" },
          { name: "Hospital A", type: "NHS Hospital", h3: "cell2" },
        ],
      });
  
      const result = await EmergencyServices.findClosestService("inputCell");
  
      expect(result).toEqual({
        police: { name: "Police A", type: "police", h3: "cell1" },
        hospital: { name: "Hospital A", type: "NHS Hospital", h3: "cell2" },
      });
  
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  
    it("returns null if no police or hospital found", async () => {
      db.query.mockResolvedValue({ rows: [] });
      h3.h3ToParent.mockReturnValue("normalized");
      h3.h3Distance.mockReturnValue(0);
  
      const result = await EmergencyServices.findClosestService("inputCell");
  
      expect(result).toEqual({ police: null, hospital: null });
    });

    it("chooses the closest police and hospital when multiple exist", async () => {
        h3.h3ToParent.mockImplementation((h3Index, res) => `${h3Index}-norm`);
        h3.h3Distance.mockImplementation((a, b) => {
          if (b.includes("near")) return 1;
          return 10;
        });
      
        db.query.mockResolvedValue({
          rows: [
            { name: "Police Near", type: "police", h3: "cell-near" },
            { name: "Police Far", type: "police", h3: "cell-far" },
            { name: "Hospital Near", type: "NHS Hospital", h3: "cell-near" },
            { name: "Hospital Far", type: "NHS Hospital", h3: "cell-far" }
          ]
        });
      
        const result = await EmergencyServices.findClosestService("inputCell");
      
        expect(result.police.name).toBe("Police Near");
        expect(result.hospital.name).toBe("Hospital Near");
      });
      

  });
  