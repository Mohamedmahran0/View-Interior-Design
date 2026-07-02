/* 
   OB Walkthrough Exporter for 3ds Max 2023+ (with V-Ray & Corona Support)
   Author: OMAR BARGOUTHI / View Interior Design
   Description: Exports the current scene to a .glb file. Includes auto-material conversion from V-Ray/Corona to standard PBR.
*/

macroScript OB_Walkthrough_Exporter
category:"View Interior Design"
tooltip:"Export & Upload to View Interior Platform"
(
    rollout OB_ExporterRollout "OB Walkthrough Exporter" width:320 height:280
    (
        -- Header UI
        label lblBrand "OMAR BARGOUTHI" align:#center height:20
        label lblPlatform "View Interior Design Platform" align:#center style_sunkenedge:true width:300 height:20
        
        -- Inputs
        group "Project Details" (
            edittext txtProjectName "Project Name:" text:"Untitled_Room" width:280 align:#left
            edittext txtAuthorId "API Key (Auth):" text:"user_123" width:280 align:#left
        )
        
        -- Export settings
        group "Export Options" (
            checkbox chkSelectedOnly "Export Selected Only" checked:false
            button btnAnalyze "Analyze Scene Polygons" width:280 height:25 align:#center
            label lblAnalysis "Polys: Unknown" align:#center
        )
        
        -- Actions
        button btnExport "Export & Upload (.glb)" width:280 height:40 align:#center tooltip:"Exports scene to GLB and uploads to the platform"
        
        -- Progress and status
        progressBar pbUpload "Progress" width:280 height:10 align:#center value:0 color:green
        label lblStatus "Status: Ready." align:#center
        
        -- Struct to hold original materials
        struct OriginalMaterialData (obj, mat)
        local originalMaterialsList = #()
        
        -- Function to safely get a property if it exists
        fn getPropSafe mat propName defaultVal = (
            if hasProperty mat propName then return (getProperty mat propName) else return defaultVal
        )
        
        -- Analyze Scene Function
        on btnAnalyze pressed do
        (
            local totalPolys = 0
            local objsToProcess = if chkSelectedOnly.checked then selection else objects
            
            for obj in objsToProcess do (
                if isProperty obj #faces then totalPolys += obj.faces.count
                else if isProperty obj #mesh then totalPolys += obj.mesh.faces.count
            )
            
            lblAnalysis.text = "Polys: " + (totalPolys as string)
            if totalPolys > 1000000 then (
                messageBox "Warning: Scene has over 1 million polygons. This may cause performance issues in the web viewer. Consider decimation." title:"High Polygon Count"
            )
        )
        
        -- Function to convert V-Ray/Corona to Physical Material
        fn convertMaterial mat = (
            if mat == undefined then return undefined
            
            local matClass = classOf mat as string
            
            -- If it's already a PhysicalMaterial, Standard, or undefined, return it as is
            if matClass == "PhysicalMaterial" or matClass == "Standardmaterial" then return mat
            
            -- Prepare new Physical Material
            local newMat = PhysicalMaterial name:(mat.name + "_Converted")
            newMat.base_weight = 1.0
            
            if matClass == "VRayMtl" then (
                newMat.base_color = getPropSafe mat #diffuse (color 128 128 128)
                if hasProperty mat #texmap_diffuse and mat.texmap_diffuse != undefined then (
                    newMat.base_color_map = mat.texmap_diffuse
                )
                if hasProperty mat #texmap_bump and mat.texmap_bump != undefined then (
                    newMat.bump_map = mat.texmap_bump
                    newMat.bump_map_amount = getPropSafe mat #texmap_bump_multiplier 1.0
                )
                -- Reflection / Roughness
                local vGloss = getPropSafe mat #reflection_glossiness 1.0
                newMat.roughness = 1.0 - vGloss
                if hasProperty mat #texmap_reflection and mat.texmap_reflection != undefined then (
                    -- Rough approximation for PBR metalness/roughness via reflection map
                    newMat.metalness_map = mat.texmap_reflection
                )
            ) else if matClass == "CoronaMtl" or matClass == "CoronaLegacyMtl" then (
                newMat.base_color = getPropSafe mat #colorDiffuse (color 128 128 128)
                if hasProperty mat #texmapDiffuse and mat.texmapDiffuse != undefined then (
                    newMat.base_color_map = mat.texmapDiffuse
                )
                -- Reflection / Roughness
                local cGloss = getPropSafe mat #reflectionGlossiness 1.0
                newMat.roughness = 1.0 - cGloss
                if hasProperty mat #texmapReflectionGlossiness and mat.texmapReflectionGlossiness != undefined then (
                    newMat.roughness_map = mat.texmapReflectionGlossiness
                )
            ) else if matClass == "CoronaPhysicalMtl" then (
                newMat.base_color = getPropSafe mat #baseColor (color 128 128 128)
                if hasProperty mat #baseColorTexmap and mat.baseColorTexmap != undefined then (
                    newMat.base_color_map = mat.baseColorTexmap
                )
                -- Roughness and Metalness natively
                newMat.roughness = getPropSafe mat #baseRoughness 0.5
                if hasProperty mat #baseRoughnessTexmap and mat.baseRoughnessTexmap != undefined then (
                    newMat.roughness_map = mat.baseRoughnessTexmap
                )
                newMat.metalness = getPropSafe mat #baseMetalness 0.0
                if hasProperty mat #baseMetalnessTexmap and mat.baseMetalnessTexmap != undefined then (
                    newMat.metalness_map = mat.baseMetalnessTexmap
                )
            ) else if matClass == "Multimaterial" then (
                -- Handle Multi/Sub-Object by converting its sub-materials
                local newMulti = multimaterial numsubs:mat.numsubs name:(mat.name + "_Converted")
                for i = 1 to mat.numsubs do (
                    if mat.materialList[i] != undefined then (
                        newMulti.materialList[i] = convertMaterial mat.materialList[i]
                    )
                )
                return newMulti
            ) else (
                -- Unknown material type, fallback to basic conversion if possible
                if hasProperty mat #diffuse then newMat.base_color = getPropSafe mat #diffuse (color 128 128 128)
            )
            
            return newMat
        )

        -- Convert and Store Original Materials
        fn convertSceneMaterials objs = (
            originalMaterialsList = #()
            for obj in objs do (
                if isProperty obj #material and obj.material != undefined then (
                    append originalMaterialsList (OriginalMaterialData obj:obj mat:obj.material)
                    obj.material = convertMaterial obj.material
                )
            )
        )
        
        -- Restore Original Materials
        fn restoreSceneMaterials = (
            for data in originalMaterialsList do (
                if isValidNode data.obj then (
                    data.obj.material = data.mat
                )
            )
            originalMaterialsList = #()
        )
        
        -- Upload Function via .NET
        fn UploadFile filePath projectName authorId =
        (
            try (
                local baseUrl = "http://localhost:3000/api/export"
                lblStatus.text = "Status: Initializing Upload..."
                
                local webClient = dotNetObject "System.Net.WebClient"
                local uriClass = dotNetClass "System.Uri"
                local encProjectName = uriClass.EscapeDataString(projectName)
                local encAuthorId = uriClass.EscapeDataString(authorId)
                
                local finalUrl = baseUrl + "?projectName=" + encProjectName + "&authorId=" + encAuthorId
                
                lblStatus.text = "Status: Uploading to platform..."
                pbUpload.value = 50
                
                local responseBytes = webClient.UploadFile finalUrl "POST" filePath
                local encoding = dotNetClass "System.Text.Encoding"
                local responseText = encoding.UTF8.GetString(responseBytes)
                
                local searchKey = "\"viewerUrl\":\""
                local idx = findString responseText searchKey
                local parsedUrl = ""
                
                if idx != undefined then (
                    local startIdx = idx + searchKey.count
                    local tempStr = substring responseText startIdx -1
                    local endIdx = findString tempStr "\""
                    if endIdx != undefined then (
                        parsedUrl = substring tempStr 1 (endIdx - 1)
                    )
                )
                
                lblStatus.text = "Status: Upload Successful!"
                pbUpload.value = 100
                
                if parsedUrl != "" then (
                    local msg = "Upload Complete!\n\nLink generated:\n" + parsedUrl + "\n\nDo you want to open it in your browser now to see the project?"
                    if queryBox msg title:"Success" then (
                        ShellLaunch parsedUrl ""
                    )
                ) else (
                    messageBox ("Upload Complete!\n\nPlatform Response:\n" + responseText) title:"Success"
                )
                
            ) catch (
                lblStatus.text = "Status: Upload Failed!"
                pbUpload.value = 0
                messageBox ("Error during upload:\n" + getCurrentException()) title:"Upload Error"
            )
        )

        -- Main Export Flow
        on btnExport pressed do
        (
            local projName = txtProjectName.text
            local authId = txtAuthorId.text
            
            if projName == "" then (
                messageBox "Please enter a Project Name." title:"Validation"
                return false
            )
            
            local tempDir = sysInfo.tempdir
            local exportPath = tempDir + projName + ".glb"
            if doesFileExist exportPath then deleteFile exportPath
            
            local objsToProcess = if chkSelectedOnly.checked then selection else objects
            if objsToProcess.count == 0 then (
                messageBox "No objects to export!" title:"Export Error"
                return false
            )
            
            lblStatus.text = "Status: Converting Materials (V-Ray/Corona)..."
            pbUpload.value = 5
            
            -- Safely convert materials
            convertSceneMaterials objsToProcess
            
            lblStatus.text = "Status: Exporting GLB (Please wait)..."
            pbUpload.value = 20
            
            local exportResult = false
            try (
                exportResult = exportFile exportPath #noPrompt selectedOnly:chkSelectedOnly.checked using:GLTFExport
            ) catch (
                exportResult = false
            )
            
            -- ALWAYS Restore materials immediately after export
            restoreSceneMaterials()
            
            if exportResult and doesFileExist exportPath then (
                lblStatus.text = "Status: GLB Exported. Preparing Upload..."
                pbUpload.value = 35
                UploadFile exportPath projName authId
            ) else (
                lblStatus.text = "Status: Export Failed!"
                pbUpload.value = 0
                messageBox "Failed to export the scene to GLB." title:"Export Error"
            )
        )
    )
    createDialog OB_ExporterRollout
)
