#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs/promises";
import * as path from "path";

import { mastra } from "./mastra";
import { synthesisWorkflow } from "./workflows";
import {
  loadSpec,
  saveCheckpoint,
  loadCheckpoint,
  saveCompilerOutput,
  saveSpec,
  saveTestSuite,
  createLogger,
  Metrics,
} from "./utils";

// ─────────────────────────────────────────────────────────────────────────────
// CLI CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const program = new Command();
const logger = createLogger("TCS", "info");
const metrics = new Metrics();

program
  .name("tcs")
  .description("Triangulated Compiler Synthesis - Autonomous compiler development")
  .version("0.1.0");

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHESIZE COMMAND
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("synthesize")
  .alias("synth")
  .description("Run the full compiler synthesis workflow")
  .option("-s, --spec <path>", "Path to initial specification", "./specs/LIQUID-SPEC.md")
  .option("-o, --output <dir>", "Output directory", "./output")
  .option("-t, --tests <count>", "Target test count", "100")
  .option("-i, --iterations <count>", "Max iterations", "50")
  .option("-p, --parallel <count>", "Parallel samples per iteration", "10")
  .option("-c, --checkpoint <interval>", "Checkpoint interval", "5")
  .option("-r, --resume", "Resume from checkpoint", false)
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n🔺 Triangulated Compiler Synthesis\n"));
    console.log(chalk.gray("Autonomous compiler development through LLM triangulation\n"));

    const spinner = ora("Initializing...").start();

    try {
      // Load initial spec
      spinner.text = "Loading specification...";
      const initialSpec = await loadSpec(options.spec);
      logger.info(`Loaded spec from ${options.spec}`);

      // Check for resume
      let resumeState = null;
      if (options.resume) {
        spinner.text = "Checking for checkpoint...";
        resumeState = await loadCheckpoint(options.output);
        if (resumeState) {
          logger.info(`Resuming from iteration ${resumeState.iteration}`);
        }
      }

      // Create output directory
      await fs.mkdir(options.output, { recursive: true });

      // Start synthesis
      spinner.text = "Starting synthesis workflow...";
      spinner.succeed("Initialization complete");

      console.log(chalk.cyan("\n📊 Configuration:"));
      console.log(chalk.gray(`   Spec: ${options.spec}`));
      console.log(chalk.gray(`   Output: ${options.output}`));
      console.log(chalk.gray(`   Target tests: ${options.tests}`));
      console.log(chalk.gray(`   Max iterations: ${options.iterations}`));
      console.log(chalk.gray(`   Parallel samples: ${options.parallel}`));
      console.log(chalk.gray(`   Checkpoint interval: ${options.checkpoint}`));
      console.log();

      metrics.startTimer("total");

      // Run workflow
      const workflowRun = await synthesisWorkflow.createRunAsync({ mastra });
      const result = await workflowRun.start({
        inputData: {
          initialSpec,
          targetTestCount: parseInt(options.tests),
          maxIterations: parseInt(options.iterations),
          parallelSamples: parseInt(options.parallel),
          checkpointInterval: parseInt(options.checkpoint),
          resume: options.resume,
        },
      });

      metrics.endTimer("total");

      if (result.status === "success") {
        console.log(chalk.bold.green("\n✅ Synthesis Complete!\n"));

        const output = result.result;

        // Save outputs
        const saveSpinner = ora("Saving outputs...").start();

        await saveCompilerOutput(options.output, output.compiler);
        await saveSpec(options.output, output.spec);
        await saveTestSuite(options.output, output.testSuite);

        saveSpinner.succeed("Outputs saved");

        // Print summary
        console.log(chalk.cyan("\n📈 Summary:"));
        console.log(chalk.gray(`   Total iterations: ${output.metrics.totalIterations}`));
        console.log(chalk.gray(`   Total samples: ${output.metrics.totalSamples}`));
        console.log(chalk.gray(`   Tests passed: ${output.metrics.testsPassed}`));
        console.log(chalk.gray(`   Spec versions: ${output.metrics.specVersions}`));
        console.log(chalk.gray(`   Total time: ${(output.metrics.totalTimeMs / 1000).toFixed(1)}s`));

        console.log(chalk.cyan("\n📁 Output files:"));
        console.log(chalk.gray(`   Compiler: ${path.join(options.output, "compiler/")}`));
        console.log(chalk.gray(`   Spec: ${path.join(options.output, `LIQUID-SPEC-v${output.spec.version}.md`)}`));
        console.log(chalk.gray(`   Tests: ${path.join(options.output, "test-suite.json")}`));

      } else if (result.status === "suspended") {
        console.log(chalk.yellow("\n⏸️  Workflow suspended"));
        console.log(chalk.gray("Run with --resume to continue"));

        await saveCheckpoint(options.output, result);

      } else {
        console.log(chalk.red("\n❌ Synthesis failed"));
        console.log(chalk.gray(JSON.stringify(result, null, 2)));
      }

    } catch (error) {
      spinner.fail("Synthesis failed");
      console.error(chalk.red(`\nError: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE COMMAND
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("validate")
  .description("Validate a compiled compiler against test suite")
  .option("-c, --compiler <dir>", "Compiler directory", "./output/compiler")
  .option("-t, --tests <path>", "Test suite path", "./output/test-suite.json")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n🧪 Validating Compiler\n"));

    const spinner = ora("Loading...").start();

    try {
      // Load compiler
      spinner.text = "Loading compiler modules...";
      const compilerDir = options.compiler;
      const files = await fs.readdir(compilerDir);
      const modules: Record<string, string> = {};

      for (const file of files) {
        if (file.endsWith(".ts") && file !== "index.ts") {
          const code = await fs.readFile(path.join(compilerDir, file), "utf-8");
          modules[file.replace(".ts", "")] = code;
        }
      }

      // Load test suite
      spinner.text = "Loading test suite...";
      const testSuiteContent = await fs.readFile(options.tests, "utf-8");
      const testSuite = JSON.parse(testSuiteContent);

      spinner.succeed(`Loaded ${Object.keys(modules).length} modules and ${testSuite.length} tests`);

      // Run tests
      console.log(chalk.cyan("\nRunning tests...\n"));

      let passed = 0;
      let failed = 0;

      for (const test of testSuite) {
        try {
          // Assemble and run compiler (simplified)
          const compilerCode = Object.values(modules).join("\n\n");
          const fn = new Function("source", `
            ${compilerCode}
            return compile(source);
          `);

          const actual = fn(test.liquidcode);
          const expected = test.expectedSchema;

          if (JSON.stringify(actual) === JSON.stringify(expected)) {
            passed++;
            process.stdout.write(chalk.green("✓"));
          } else {
            failed++;
            process.stdout.write(chalk.red("✗"));
          }
        } catch (e) {
          failed++;
          process.stdout.write(chalk.red("✗"));
        }
      }

      console.log("\n");

      if (failed === 0) {
        console.log(chalk.bold.green(`✅ All ${passed} tests passed!`));
      } else {
        console.log(chalk.yellow(`⚠️  ${passed} passed, ${failed} failed`));
      }

    } catch (error) {
      spinner.fail("Validation failed");
      console.error(chalk.red(`\nError: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE COMMAND
// ─────────────────────────────────────────────────────────────────────────────

program
  .command("sample")
  .description("Generate a single sample for testing")
  .option("-p, --prompt <text>", "Dashboard prompt", "Create a simple analytics dashboard with 4 KPIs")
  .action(async (options) => {
    console.log(chalk.bold.cyan("\n🎨 Generating Sample\n"));
    console.log(chalk.gray(`Prompt: ${options.prompt}\n`));

    const spinner = ora("Generating JSX...").start();

    try {
      const jsxAgent = mastra.getAgent("jsx-generator");
      const schemaAgent = mastra.getAgent("schema-extractor");
      const liquidAgent = mastra.getAgent("liquidcode-writer");

      // Generate JSX
      const jsxResult = await jsxAgent.generate(options.prompt);
      spinner.text = "Extracting schema...";

      // Extract schema
      const schemaResult = await schemaAgent.generate(
        `Extract LiquidSchema:\n${jsxResult.text}`
      );
      spinner.text = "Writing LiquidCode...";

      // Write LiquidCode
      const liquidResult = await liquidAgent.generate(
        `Convert to LiquidCode:\n${schemaResult.text}`
      );

      spinner.succeed("Sample generated");

      console.log(chalk.cyan("\n📦 JSX:"));
      console.log(chalk.gray(jsxResult.text.slice(0, 500) + "...\n"));

      console.log(chalk.cyan("📋 Schema:"));
      console.log(chalk.gray(schemaResult.text.slice(0, 500) + "...\n"));

      console.log(chalk.cyan("💧 LiquidCode:"));
      console.log(chalk.white(liquidResult.text));

    } catch (error) {
      spinner.fail("Generation failed");
      console.error(chalk.red(`\nError: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// RUN CLI
// ─────────────────────────────────────────────────────────────────────────────

program.parse();
