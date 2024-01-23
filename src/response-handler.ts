function setConfigFromArgs(code: string, logFileName: string, logFilePath: string, logLevel: string, format: string): string {
    const importLoggingString = 'import logging';
    const loggingBasicConfigString = 'logging.basicConfig';
    let modifiedCode = code;

    // Check if 'import logging' exists
    if (modifiedCode.indexOf(importLoggingString) === -1) {
        modifiedCode = importLoggingString + '\n' + modifiedCode;
    }

    // Ensure the log file path ends with '/'
    if (logFilePath && logFilePath[logFilePath.length - 1] !== '/') {
        logFilePath += '/';
    }

    // Ensure the log file name ends with '.log'
    if (!logFileName.endsWith('.log')) {
        logFileName += '.log';
    }

    const configLine = `logging.basicConfig(filename='${logFilePath}${logFileName}', level=logging.${logLevel.toUpperCase()}, format='${format}')`;

    // Check if the code already has 'logging.basicConfig'
    const basicConfigIndex = modifiedCode.indexOf(loggingBasicConfigString);
    if (basicConfigIndex !== -1) {
        // Find the end of the line where 'logging.basicConfig' is and replace it
        let endOfLineIndex = modifiedCode.indexOf('\n', basicConfigIndex);
        if (endOfLineIndex === -1) {
            endOfLineIndex = modifiedCode.length;
        }
        modifiedCode = modifiedCode.substring(0, basicConfigIndex) + configLine + modifiedCode.substring(endOfLineIndex);
    } else {
        // Find the last import and add 'logging.basicConfig' after it
        const lastImportIndex = modifiedCode.lastIndexOf('import ');
        const endOfLastImportIndex = modifiedCode.indexOf('\n', lastImportIndex);
        modifiedCode = modifiedCode.substring(0, endOfLastImportIndex + 1) + configLine + '\n' + modifiedCode.substring(endOfLastImportIndex + 1);
    }

    return modifiedCode;
}

function isValidResponse(original: string, modified: string): boolean {
    // Ignore empty lines in original code and modified code
    const originalLines = original.split('\n').filter(line => line.trim());
    const modifiedLines = modified.split('\n').filter(line => line.trim());

    let origIndex = 0;
    let modIndex = 0;

    // Regex to match valid logging additions
    const loggingRegex = /^(import logging|from logging import|logging.basicConfig\([^)]*\)|logger\s*=\s*logging.getLogger\(__name__\)|(logger|logging)\.(debug|info|warning|error|critical)\([^)]*\))$/;

    console.log(originalLines.length, modifiedLines.length);

    while (origIndex < originalLines.length || modIndex < modifiedLines.length) {
        let origLine = "";
        let modLine = "";

        if (origIndex < originalLines.length) {
            origLine = originalLines[origIndex].trim();
        }
        if (modIndex < modifiedLines.length) {
            modLine = modifiedLines[modIndex].trim();
        }

        // If all original lines have been read, just check for valid logging additions
        if (origIndex === originalLines.length && !loggingRegex.test(modLine)) {
            return false;
        }
        if (modLine && !loggingRegex.test(modLine) && modLine !== origLine) {
            return false; // Unauthorized change detected
        }
        if (modLine === origLine && !loggingRegex.test(modLine)) {
            origIndex++;
        }
        
        modIndex++;
    }
    
    if (origIndex < originalLines.length) {
        return false; // Some original lines are missing in the modified code
    }

    return true;
}


function parseCode(input: string): string {
    // check if the code start with ```python and ends with ```
    // if yes, remove them
    // if no, return the code as is

    const startMarker = "```python";
    const endMarker = "```";
    
    // Find the first index of ```python
    const startIndex = input.indexOf(startMarker);
    // Find the last index of ```
    const endIndex = input.lastIndexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        // Extract the substring, adjusting for the length of the markers
        return input.substring(startIndex + startMarker.length, endIndex).trim();
    }

    // Return the entire input if the markers are not found in the correct order
    return input;
}
export { setConfigFromArgs, isValidResponse, parseCode };