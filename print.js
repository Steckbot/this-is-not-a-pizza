const { exec } = require("child_process");
const printer = "EPSON_ET_2850_Series";
const file = "myfile.jpg";
constcommand = `lp -d ${printer} -o media=A6 -o cupsPrintQuality=High ${file}`;
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});
