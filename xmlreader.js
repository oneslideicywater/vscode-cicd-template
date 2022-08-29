const xml2js = require('xml2js');
const fs = require('fs');
const parser = new xml2js.Parser({ attrkey: "ATTR" });


// analysis project name and modules
function analysisProject(workdir){

    let proj_name= "cicd-example"
    let modules = []
    // this example reads the file synchronously
    // you can read it asynchronously also
    let xml_string = fs.readFileSync(workdir+"/pom.xml", "utf8");
    
    parser.parseString(xml_string, function(error, result) {
        if(error === null) {
            proj_name= result.project.artifactId[0];
            if(result.project.modules == null){
                modules=[]
            }else{
                modules = result.project.modules[0].module
            }
            
            console.log(modules)
        }
        else {
            console.log(error);
        }
    });
    // project and modules
    let pm = {
        mods: modules,
        project: proj_name
    }
    
    return pm;
}


module.exports = {
	analysisProject
}
