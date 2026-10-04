/**
 * Custom blocks for tracking and auto-correcting project version changelogs.
 * These blocks use persistent flash/local storage to maintain version numbers
 * and structural log history across game updates, resets, and compiles.
 */

//% color="#2E7D32" icon="\uf022" block="Changelog"
//% weight=100
namespace projectChangelog {
    
    // Enum defining semantic version updates for the auto-correction algorithm
    export enum VersionBump {
        //% block="Patch (Bug Fixes)"
        Patch = 1,
        //% block="Minor (New Features)"
        Minor = 2,
        //% block="Major (Breaking Changes)"
        Major = 3
    }

    // Storage keys used for persistence in device flash/browser localStorage
    const KEY_VERSION = "cl_curr_version";
    const KEY_LOGS = "cl_history_logs";
    const DEFAULT_VERSION = "1.0.0";

    /**
     * Initializes the project versioning system if it has not been set up.
     * If a version already exists in memory, it retains that version.
     * @param initialVersion The starting semantic version string, e.g., "1.0.0"
     */
    //% blockId=changelog_init
    //% block="initialize changelog with starting version %initialVersion"
    //% initialVersion.defl="1.0.0"
    //% weight=95
    export function initializeChangelog(initialVersion: string): void {
        if (!settings.exists(KEY_VERSION)) {
            settings.writeString(KEY_VERSION, initialVersion);
        }
        if (!settings.exists(KEY_LOGS)) {
            settings.writeString(KEY_LOGS, "");
        }
    }

    /**
     * Internal helper function to split a string by a character delimiter.
     * Necessary for standard MakeCode compilation constraints.
     */
    function splitString(str: string, delimiter: string): string[] {
        let result: string[] = [];
        let current = "";
        for (let i = 0; i < str.length; i++) {
            if (str.charAt(i) == delimiter) {
                result.push(current);
                current = "";
            } else {
                current += str.charAt(i);
            }
        }
        if (current.length > 0) {
            result.push(current);
        }
        return result;
    }

    /**
     * Automatically calculates, updates, and records the project version 
     * based on semantic versioning rules, adding the accompanying descriptive log.
     * @param changeType The severity level of the modification (Major, Minor, or Patch)
     * @param description A brief summary detailing what changed in this version
     */
    //% blockId=changelog_add_entry
    //% block="log change %changeType with description %description"
    //% description.defl="Fixed sprite overlap issues."
    //% weight=90
    export function logChange(changeType: VersionBump, description: string): void {
        // Ensure defaults exist if initialization was skipped
        if (!settings.exists(KEY_VERSION)) {
            settings.writeString(KEY_VERSION, DEFAULT_VERSION);
        }
        if (!settings.exists(KEY_LOGS)) {
            settings.writeString(KEY_LOGS, "");
        }

        // Fetch current version data
        let currentVerStr = settings.readString(KEY_VERSION);
        let versionParts = splitString(currentVerStr, ".");

        // Parse versions into safe numbers or fall back to baseline
        let major = versionParts.length > 0 ? parseInt(versionParts[0]) : 1;
        let minor = versionParts.length > 1 ? parseInt(versionParts[1]) : 0;
        let patch = versionParts.length > 2 ? parseInt(versionParts[2]) : 0;

        if (isNaN(major)) major = 1;
        if (isNaN(minor)) minor = 0;
        if (isNaN(patch)) patch = 0;

        // Auto-correct version number matching standard semantic version rules
        if (changeType === VersionBump.Major) {
            major += 1;
            minor = 0;
            patch = 0;
        } else if (changeType === VersionBump.Minor) {
            minor += 1;
            patch = 0;
        } else if (changeType === VersionBump.Patch) {
            patch += 1;
        }

        // Generate the new validated version label string
        let newVersionStr = major + "." + minor + "." + patch;
        settings.writeString(KEY_VERSION, newVersionStr);

        // Append the formatted entry string to the historic log store
        let historicalLogs = settings.readString(KEY_LOGS);
        let timestamp = "v" + newVersionStr + ": " + description;
        
        if (historicalLogs.length > 0) {
            historicalLogs = timestamp + "\n" + historicalLogs;
        } else {
            historicalLogs = timestamp;
        }
        settings.writeString(KEY_LOGS, historicalLogs);
    }

    /**
     * Retrieves the current verified project version string.
     */
    //% blockId=changelog_get_version
    //% block="current project version"
    //% weight=85
    export function currentVersion(): string {
        if (!settings.exists(KEY_VERSION)) {
            return DEFAULT_VERSION;
        }
        return settings.readString(KEY_VERSION);
    }

    /**
     * Outputs the entire auto-corrected version history straight to the developer console.
     */
    //% blockId=changelog_dump_history
    //% block="print complete changelog to console"
    //% weight=80
    export function printChangelogToConsole(): void {
        console.log("=== PROJECT CHANGELOG HISTORY ===");
        if (settings.exists(KEY_LOGS)) {
            let logs = settings.readString(KEY_LOGS);
            if (logs.length > 0) {
                console.log(logs);
            } else {
                console.log("No changelog entries recorded yet.");
            }
        } else {
            console.log("Changelog system uninitialized.");
        }
        console.log("=================================");
    }

    /**
     * Pauses gameplay execution and clears the screen to display a fully readable, 
     * clean menu log interface of the project versions directly in the simulator.
     */
    //% blockId=changelog_view_ui
    //% block="display changelog overlay viewer"
    //% weight=75
    export function displayChangelogOverlay(): void {
        game.pushScene(); // Create an isolated rendering layer
        scene.setBackgroundColor(15); // Clear screen using dark background coloration

        let displayLines: string[] = [];
        displayLines.push("  PROJECT CHANGELOG  ");
        displayLines.push("---------------------");

        if (settings.exists(KEY_LOGS)) {
            let fullLog = settings.readString(KEY_LOGS);
            let parsedEntries = splitString(fullLog, "\n");
            for (let i = 0; i < parsedEntries.length; i++) {
                if (displayLines.length < 10) { // Bound checking to prevent view clipping
                    displayLines.push(parsedEntries[i]);
                }
            }
        }

        if (displayLines.length <= 2) {
            displayLines.push("No log items found.");
        }
        
        displayLines.push("");
        displayLines.push(" Press (A) to return ");

        // Loop the UI layer screen refresh till back key confirmation occurs
        let exitScreen = false;
        controller.A.onEvent(ControllerButtonEvent.Pressed, function() {
            exitScreen = true;
        });

        while (!exitScreen) {
            for (let j = 0; j < displayLines.length; j++) {
                screen.print(displayLines[j], 4, 10 + (j * 10), 1, image.font8);
            }
            pause(100);
        }

        game.popScene(); // Restore normal underlying game execution state cleanly
    }
}
