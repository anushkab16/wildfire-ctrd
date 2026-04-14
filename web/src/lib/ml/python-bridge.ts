import { execFile } from "child_process";
import { writeFile, unlink, mkdtemp, access } from "fs/promises";
import path from "path";
import os from "os";

export type ModelPredictions = Record<
  string,
  {
    arima: number | null;
    exponential_smoothing: number | null;
    gradient_boosting: number | null;
  }
>;

export type GrangerMatrix = Record<string, Record<string, number | null>>;

export type PythonMLResult = {
  success: boolean;
  error?: string;
  model_predictions: ModelPredictions;
  ensemble_predictions: Record<string, number>;
  granger_causality: GrangerMatrix;
  dynamic_weights: Record<string, number>;
  composite_score: number;
  alert_level: string;
  action: string;
  dominant_driver: string;
  component_series: Record<string, number[]>;
  models_used: string[];
  num_rows: number;
};

const EMPTY_RESULT: PythonMLResult = {
  success: false,
  error: "Python ML pipeline not available",
  model_predictions: {},
  ensemble_predictions: {},
  granger_causality: {},
  dynamic_weights: {},
  composite_score: 0,
  alert_level: "GREEN",
  action: "",
  dominant_driver: "",
  component_series: {},
  models_used: [],
  num_rows: 0,
};

async function findPython(projectRoot: string): Promise<string> {
  const venvPython = path.join(projectRoot, ".venv", "bin", "python3");
  try {
    await access(venvPython);
    return venvPython;
  } catch {
    return "python3";
  }
}

export async function runPythonML(csvText: string): Promise<PythonMLResult> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "wildfire-"));
  const csvPath = path.join(tmpDir, "data.csv");

  try {
    await writeFile(csvPath, csvText, "utf8");

    const projectRoot = path.resolve(process.cwd(), "..");
    const bridgeScript = path.join(projectRoot, "ml_bridge.py");
    const pythonBin = await findPython(projectRoot);

    const result = await new Promise<string>((resolve, reject) => {
      execFile(
        pythonBin,
        [bridgeScript, csvPath],
        {
          cwd: projectRoot,
          timeout: 60_000,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
            return;
          }
          resolve(stdout);
        },
      );
    });

    const parsed = JSON.parse(result) as PythonMLResult;
    return parsed;
  } catch (e) {
    console.error("[python-bridge] ML pipeline failed:", e);
    return { ...EMPTY_RESULT, error: String(e) };
  } finally {
    try {
      await unlink(csvPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}
