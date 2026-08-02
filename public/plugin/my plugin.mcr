-- ============================================================
--  OB Walkthrough Exporter v3.0
--  Omar Bargouthi - View Interior Design Platform
--
--  FIXED PIPELINE:
--  [1] Convert all materials to Physical
--  [2] Auto UV-Unwrap Channel 2 per object
--  [3] Bake using Render To Texture (RTT) API correctly
--       Corona  -> CoronaBeauty element
--       VRay    -> VRayCompleteMap element
--       Default -> CompleteMap element
--  [4] Apply baked PNG as base_color_map on UV channel 2
--  [5] Export GLB -> Upload
-- ============================================================

macroScript OB_Walkthrough_Exporter
category:"omar"
tooltip:"my plugin"
(

-- ============================================================
--  GLOBALS
-- ============================================================
global OB_convLog   = #()
global OB_convCount = 0
global OB_mapFixed  = 0
global doConvert_OB

-- ============================================================
--  Detect active renderer
-- ============================================================
fn OB_detectRenderer = (
    local rCls = classof renderers.current as string
    if matchPattern rCls pattern:"*Corona*" then return "corona"
    if matchPattern rCls pattern:"*VRay*"   then return "vray"
    return "default"
)

-- ============================================================
--  resolveMap
-- ============================================================
fn resolveMap_OB m = (
    if m == undefined then return undefined
    local cls = classof m as string
    if classof m == BitmapTexture then return m
    if matchPattern cls pattern:"CoronaBitmap*" then (
        local b = BitmapTexture()
        try( b.filename        = m.filename )catch()
        try( b.coords.U_Tiling = m.tileU )catch()
        try( b.coords.V_Tiling = m.tileV )catch()
        try( b.coords.U_Offset = m.offsetU )catch()
        try( b.coords.V_Offset = m.offsetV )catch()
        OB_mapFixed += 1; return b
    )
    if matchPattern cls pattern:"VRayBitmap*" then (
        local b = BitmapTexture()
        try( b.filename        = m.HDRIMapName )catch()
        try( b.coords.U_Tiling = m.UVWtileU )catch()
        try( b.coords.V_Tiling = m.UVWtileV )catch()
        OB_mapFixed += 1; return b
    )
    if matchPattern cls pattern:"Color_Correction*" or \
       matchPattern cls pattern:"ColorCorrection*"  then (
        local inner = undefined
        try( inner = m.map )catch()
        OB_mapFixed += 1
        if inner != undefined then return (resolveMap_OB inner)
        return undefined
    )
    if matchPattern cls pattern:"CoronaColorCorrect*" then (
        local inner = undefined
        try( inner = m.textureMap )catch()
        OB_mapFixed += 1
        if inner != undefined then return (resolveMap_OB inner)
        return undefined
    )
    if matchPattern cls pattern:"Output*" then (
        local inner = undefined
        try( inner = m.map )catch()
        OB_mapFixed += 1
        if inner != undefined then return (resolveMap_OB inner)
        return undefined
    )
    if matchPattern cls pattern:"VRayColor*" then ( OB_mapFixed += 1; return undefined )
    if matchPattern cls pattern:"Mix*" then (
        local inner = undefined
        try( inner = m.map1 )catch()
        OB_mapFixed += 1
        if inner != undefined then return (resolveMap_OB inner)
        return undefined
    )
    return m
)

-- ============================================================
--  Clean Physical Material slots
-- ============================================================
fn cleanPhysicalMaps_OB pm = (
    if pm == undefined then return()
    if classof pm != PhysicalMaterial then return()
    try( if pm.base_color_map   != undefined then pm.base_color_map   = resolveMap_OB pm.base_color_map   )catch()
    try( if pm.roughness_map    != undefined then pm.roughness_map    = resolveMap_OB pm.roughness_map    )catch()
    try( if pm.refl_color_map   != undefined then pm.refl_color_map   = resolveMap_OB pm.refl_color_map   )catch()
    try( if pm.bump_map         != undefined then pm.bump_map         = resolveMap_OB pm.bump_map         )catch()
    try( if pm.displacement_map != undefined then pm.displacement_map = resolveMap_OB pm.displacement_map )catch()
    try( if pm.cutout_map       != undefined then pm.cutout_map       = resolveMap_OB pm.cutout_map       )catch()
    try( if pm.emission_map     != undefined then pm.emission_map     = resolveMap_OB pm.emission_map     )catch()
    try( if pm.trans_color_map  != undefined then pm.trans_color_map  = resolveMap_OB pm.trans_color_map  )catch()
    try( if pm.metalness_map    != undefined then pm.metalness_map    = resolveMap_OB pm.metalness_map    )catch()
    try( if pm.normal_map       != undefined then pm.normal_map       = resolveMap_OB pm.normal_map       )catch()
)

-- ============================================================
--  Convert Corona to Physical
-- ============================================================
fn doConvertCorona_OB mat = (
    local pm = PhysicalMaterial()
    pm.name = mat.name
    try( pm.base_color     = mat.diffuse )catch()
    try( pm.base_color_map = resolveMap_OB mat.texmapDiffuse )catch()
    try( pm.base_weight    = mat.diffuseLevel )catch()
    try( pm.reflectivity   = mat.reflectivity )catch()
    try( pm.roughness      = 1.0 - mat.brdfGlossiness )catch()
    try( pm.refl_color_map = resolveMap_OB mat.texmapReflect )catch()
    try( pm.roughness_map  = resolveMap_OB mat.texmapRoughness )catch()
    try( if mat.refractionLevel > 0 then (
            pm.transparency    = mat.refractionLevel
            pm.trans_color_map = resolveMap_OB mat.texmapRefract
            pm.trans_ior       = mat.refractionIor ) )catch()
    try( pm.bump_map         = resolveMap_OB mat.texmapBump )catch()
    try( pm.bump_map_amt     = mat.bumpLevel * 100.0 )catch()
    try( pm.displacement_map = resolveMap_OB mat.texmapDisplace )catch()
    try( if mat.selfIlluminationLuminance > 0 then (
            pm.emission       = mat.selfIlluminationLuminance
            pm.emission_color = mat.selfIlluminationColor
            pm.emission_map   = resolveMap_OB mat.texmapSelfIllum ) )catch()
    try( pm.cutout_map = resolveMap_OB mat.texmapOpacity )catch()
    OB_convCount += 1
    append OB_convLog ("Corona to Physical: " + pm.name)
    pm
)

-- ============================================================
--  Convert VRay to Physical
-- ============================================================
fn doConvertVRay_OB mat = (
    local pm = PhysicalMaterial()
    pm.name = mat.name
    try( pm.base_color     = mat.diffuse )catch()
    try( pm.base_color_map = resolveMap_OB mat.texmap_diffuse )catch()
    try( pm.base_weight    = mat.diffuse_multiplier )catch()
    try( pm.reflectivity   = mat.reflection_multiplier )catch()
    try( pm.roughness      = 1.0 - mat.reflection_glossiness )catch()
    try( pm.refl_color     = mat.reflection )catch()
    try( pm.refl_color_map = resolveMap_OB mat.texmap_reflection )catch()
    try( pm.roughness_map  = resolveMap_OB mat.texmap_reflectionGlossiness )catch()
    try( local rg = (mat.refraction.r + mat.refraction.g + mat.refraction.b) / 3.0
         if rg > 0.01 then (
            pm.transparency    = rg
            pm.trans_color_map = resolveMap_OB mat.texmap_refraction
            pm.trans_ior       = mat.refraction_ior ) )catch()
    try( pm.bump_map         = resolveMap_OB mat.texmap_bump )catch()
    try( pm.bump_map_amt     = mat.texmap_bump_multiplier )catch()
    try( pm.displacement_map = resolveMap_OB mat.texmap_displacement )catch()
    try( local sg = (mat.self_illumination.r + mat.self_illumination.g + mat.self_illumination.b) / 3.0
         if sg > 0.01 then (
            pm.emission       = sg * 1000.0
            pm.emission_color = mat.self_illumination
            pm.emission_map   = resolveMap_OB mat.texmap_self_illumination ) )catch()
    try( pm.cutout_map = resolveMap_OB mat.texmap_opacity )catch()
    OB_convCount += 1
    append OB_convLog ("VRayMtl to Physical: " + pm.name)
    pm
)

-- ============================================================
--  Convert Standard to Physical
-- ============================================================
fn doConvertStandard_OB mat = (
    local pm = PhysicalMaterial()
    pm.name = mat.name
    try( pm.base_color     = mat.diffuse )catch()
    try( pm.base_color_map = resolveMap_OB mat.diffuseMap )catch()
    try( local sg = (mat.specular.r + mat.specular.g + mat.specular.b) / 3.0
         pm.reflectivity = sg * 0.5
         pm.roughness    = 1.0 - (mat.glossiness / 100.0) )catch()
    try( pm.bump_map         = resolveMap_OB mat.bumpMap )catch()
    try( pm.bump_map_amt     = mat.bumpMapAmount )catch()
    try( pm.displacement_map = resolveMap_OB mat.displacementMap )catch()
    try( pm.cutout_map       = resolveMap_OB mat.opacityMap )catch()
    try( if mat.selfIllumAmount > 0 then (
            pm.emission     = mat.selfIllumAmount * 10.0
            pm.emission_map = resolveMap_OB mat.selfIllumMap ) )catch()
    OB_convCount += 1
    append OB_convLog ("Standard to Physical: " + pm.name)
    pm
)

-- ============================================================
--  Main recursive converter
-- ============================================================
fn doConvert_OB mat = (
    if mat == undefined then return undefined
    local cls = classof mat as string
    if classof mat == PhysicalMaterial then ( cleanPhysicalMaps_OB mat; return mat )
    if matchPattern cls pattern:"Corona*Mtl*" or \
       matchPattern cls pattern:"CoronaMtl*"  or \
       matchPattern cls pattern:"CoronaLegacy*" then return (doConvertCorona_OB mat)
    if matchPattern cls pattern:"CoronaPhysicalMtl*" then (
        local pm = PhysicalMaterial(); pm.name = mat.name
        try( pm.base_color     = mat.baseColor )catch()
        try( pm.base_color_map = resolveMap_OB mat.texmap_base_color )catch()
        try( pm.roughness      = mat.roughness )catch()
        try( pm.metalness      = mat.metalness )catch()
        try( pm.bump_map       = resolveMap_OB mat.texmap_bump )catch()
        OB_convCount += 1
        append OB_convLog ("CoronaPhysical to Physical: " + pm.name)
        return pm
    )
    if matchPattern cls pattern:"CoronaLayeredMtl*" then (
        for i = 1 to 10 do (
            try( local sub = execute ("mat.mtl" + (i as string))
                 if sub != undefined then (
                     local cv = doConvert_OB sub
                     if cv != undefined then execute ("mat.mtl" + (i as string) + " = cv") ) )catch()
        ); return mat
    )
    if matchPattern cls pattern:"VRayMtl*"  or \
       matchPattern cls pattern:"VRay_Mtl*" or \
       matchPattern cls pattern:"VRayMat*"  then return (doConvertVRay_OB mat)
    if matchPattern cls pattern:"VRay2SidedMtl*" then (
        local inner = doConvert_OB mat.frontMaterial
        if inner != undefined then inner.name = mat.name; return inner )
    if matchPattern cls pattern:"VRayBlendMtl*" then (
        local base = doConvert_OB mat.baseMtl
        for i = 1 to 9 do (
            try( local coat = execute ("mat.coatMtl_" + (i as string))
                 if coat != undefined then (
                     local cv = doConvert_OB coat
                     if cv != undefined then execute ("mat.coatMtl_" + (i as string) + " = cv") ) )catch() )
        if base != undefined then ( base.name = mat.name; return base ); return mat )
    if matchPattern cls pattern:"VRayLightMtl*" then (
        local pm = PhysicalMaterial(); pm.name = mat.name
        try( pm.emission       = mat.multiplier * 1000.0 )catch()
        try( pm.emission_color = mat.color )catch()
        try( pm.emission_map   = resolveMap_OB mat.texmap )catch()
        OB_convCount += 1; append OB_convLog ("VRayLightMtl to Physical: " + pm.name); return pm )
    if matchPattern cls pattern:"VRayFastSSS2*" then (
        local pm = PhysicalMaterial(); pm.name = mat.name
        try( pm.base_color     = mat.diffuse_color )catch()
        try( pm.base_color_map = resolveMap_OB mat.texmap_diffuse_color )catch()
        OB_convCount += 1; append OB_convLog ("VRayFastSSS2 to Physical: " + pm.name); return pm )
    if matchPattern cls pattern:"VRayOverrideMtl*" then (
        local base = doConvert_OB mat.baseMtl
        if base != undefined then ( base.name = mat.name; return base ); return mat )
    if classof mat == Standardmaterial then return (doConvertStandard_OB mat)
    if matchPattern cls pattern:"Arch___Design*" or matchPattern cls pattern:"ArchDesign*" then (
        local pm = PhysicalMaterial(); pm.name = mat.name
        try( pm.base_color     = mat.Diffuse_Color )catch()
        try( pm.base_color_map = resolveMap_OB mat.Diffuse_Color_Map )catch()
        try( pm.roughness      = 1.0 - mat.Reflectance_Scale )catch()
        try( pm.bump_map       = resolveMap_OB mat.Bump_Map )catch()
        OB_convCount += 1; append OB_convLog ("Arch&Design to Physical: " + pm.name); return pm )
    if classof mat == Multimaterial then (
        for i = 1 to mat.numsubs do (
            local sub = mat[i]
            if sub != undefined then ( local cv = doConvert_OB sub; if cv != undefined then mat[i] = cv ) )
        append OB_convLog ("Multi/Sub processed: " + mat.name); return mat )
    if classof mat == Double_Sided then (
        try( local f = doConvert_OB mat.material1; if f != undefined then mat.material1 = f )catch()
        try( local b = doConvert_OB mat.material2; if b != undefined then mat.material2 = b )catch()
        return mat )
    if classof mat == Blend_material or matchPattern cls pattern:"Blend*" then (
        try( local m1 = doConvert_OB mat.material1; if m1 != undefined then mat.material1 = m1 )catch()
        try( local m2 = doConvert_OB mat.material2; if m2 != undefined then mat.material2 = m2 )catch()
        return mat )
    if matchPattern cls pattern:"Shell_Material*" then (
        try( local o = doConvert_OB mat.originalMaterial; if o != undefined then mat.originalMaterial = o )catch()
        try( local k = doConvert_OB mat.bakedMaterial;    if k != undefined then mat.bakedMaterial    = k )catch()
        return mat )
    undefined
)

fn deepCleanAllPhysical_OB = (
    for obj in objects do (
        if obj.material != undefined then (
            if classof obj.material == PhysicalMaterial then
                cleanPhysicalMaps_OB obj.material
            else if classof obj.material == Multimaterial then (
                for i = 1 to obj.material.numsubs do (
                    local sub = obj.material[i]
                    if sub != undefined and classof sub == PhysicalMaterial then
                        cleanPhysicalMaps_OB sub ) ) ) )
)

fn runConvertAll_OB objsList = (
    OB_convLog = #(); OB_convCount = 0; OB_mapFixed = 0
    for obj in objsList do (
        if obj.material != undefined then (
            local cv = doConvert_OB obj.material
            if cv != undefined then obj.material = cv ) )
    deepCleanAllPhysical_OB()
)

-- ============================================================
--  ENSURE UV CHANNEL 2
--  Checks mesh map channels directly — no false positives
-- ============================================================
fn OB_ensureUV2 obj = (
    local hasUV2 = false
    try (
        local me = snapshotAsMesh obj
        if getNumMaps me >= 2 then
            if getMapSupport me 2 then hasUV2 = true
        delete me
    ) catch()

    if not hasUV2 then (
        -- Add Unwrap UVW on channel 2
        local uvMod = Unwrap_UVW()
        addModifier obj uvMod
        uvMod.setMapChannel 2
        -- Flatten with 45 degree threshold, 0.02 spacing, pack normalized
        uvMod.flattenMap 45.0 #() 0.02 true 1 true true
        print ("UV2 added: " + obj.name)
    )
)

-- ============================================================
--  CORE BAKE FUNCTION
--  Uses the correct 3ds Max Render To Texture (RTT) API:
--    bakeObjectList, bake_selected, render bakeSelected
--  This is the ONLY correct way to bake in MAXScript
-- ============================================================
fn OB_bakeObject obj bakeDir bakeSize rendererType = (
    local safeName = substituteString obj.name " " "_"
    safeName = substituteString safeName ":" "_"
    safeName = substituteString safeName "/" "_"
    local outFile = bakeDir + safeName + "_baked.png"

    try (
        -- Make sure UV channel 2 exists
        OB_ensureUV2 obj

        -- Select only this object
        select obj

        -- Clear existing bake elements on this object
        local bakeData = obj.INodeBakeProperties
        bakeData.removeAllBakeElements()
        bakeData.bakeEnabled   = true
        bakeData.bakeChannel   = 2       -- UV channel to bake onto
        bakeData.nDilations    = 3       -- padding pixels to avoid seams
        bakeData.bakeToVertexColor = false

        -- Choose bake element based on renderer
        -- Corona: CoronaBeauty captures GI+Direct+Indirect+AO
        -- VRay:   VRayCompleteMap captures GI+Direct+Indirect
        -- Other:  CompleteMap (scanline)
        local bakeEl = undefined

        if rendererType == "corona" then (
            try( bakeEl = CoronaBeauty() )catch()
            if bakeEl == undefined then
                try( bakeEl = CoronaDiffuse() )catch()
        )
        if rendererType == "vray" then (
            try( bakeEl = VRayCompleteMap() )catch()
            if bakeEl == undefined then
                try( bakeEl = VRayLightingMap() )catch()
        )
        -- Fallback for any renderer
        if bakeEl == undefined then (
            try( bakeEl = CompleteMap() )catch()
            if bakeEl == undefined then
                bakeEl = LightingMap()
        )

        -- Configure element
        bakeEl.enabled      = true
        bakeEl.outputWidth  = bakeSize
        bakeEl.outputHeight = bakeSize
        bakeEl.filename     = outFile
        bakeEl.fileType     = "png"

        -- Add element to object's bake list
        bakeData.addBakeElement bakeEl

        -- Render to texture using the proper API
        render renderType:#bakeSelected \
               selected:true \
               vfb:false \
               progressBar:false

        -- Check result
        if doesFileExist outFile then (
            print ("Bake OK: " + obj.name + " -> " + outFile)
            return outFile
        ) else (
            print ("Bake produced no file: " + obj.name)
            return undefined
        )
    ) catch (
        print ("Bake FAILED: " + obj.name + " | " + getCurrentException())
        return undefined
    )
)

-- ============================================================
--  APPLY BAKED TEXTURE
--  Puts baked PNG on base_color_map using UV Channel 2
--  Kills emission so viewer shows baked light only
-- ============================================================
--  Apply baked texture to a single PhysicalMaterial slot
-- ============================================================
fn OB_applyToPM pm texFile = (
    if classof pm != PhysicalMaterial then return()
    local bm              = BitmapTexture()
    bm.filename           = texFile
    bm.coords.mappingType = 0  -- Map Channel mode
    bm.coords.mapChannel  = 2  -- UV Channel 2 (baked UVs)
    pm.base_color_map     = bm
    pm.base_weight        = 1.0
    pm.emission           = 0.0
    pm.emission_map       = undefined
    pm.reflectivity       = 0.0
    pm.roughness          = 1.0
)

fn OB_applyBakedTex obj texFile = (
    if texFile == undefined        then return()
    if not (doesFileExist texFile) then return()
    if obj.material == undefined   then return()

    if classof obj.material == PhysicalMaterial then (
        OB_applyToPM obj.material texFile
    ) else if classof obj.material == Multimaterial then (
        for i = 1 to obj.material.numsubs do (
            local sub = obj.material[i]
            if sub != undefined and classof sub == PhysicalMaterial then
                OB_applyToPM sub texFile
        )
    )
)

-- ============================================================
--  BAKE ALL OBJECTS
-- ============================================================
fn bakeSceneLighting_OB objsList bakeDir bakeSize rendererType = (
    if not doesFileExist bakeDir then makeDir bakeDir
    local bakedCount = 0

    for obj in objsList do (
        if (superClassOf obj == GeometryClass) and (obj.material != undefined) then (
            local texFile = OB_bakeObject obj bakeDir bakeSize rendererType
            if texFile != undefined then (
                OB_applyBakedTex obj texFile
                bakedCount += 1
            )
        )
    )
    bakedCount
)

-- ============================================================
--  Main UI
-- ============================================================
rollout OB_ExporterRollout "OB Walkthrough Exporter v3.0" width:360 height:430 (

    label lblBrand    "OMAR BARGOUTHI"               align:#center height:18 offset:[0,4]
    label lblPlatform "View Interior Design Platform" align:#center height:18 \
                       style_sunkenedge:true width:340
    label lblRenderer "Renderer: --" align:#center height:16 offset:[0,3]

    group "Project Details" (
        edittext txtProjectName "Project Name:" text:"Untitled_Room" width:320 align:#left labelOnTop:true
        edittext txtAuthorId    "API Key:"       text:"user_123"      width:320 align:#left labelOnTop:true
    )

    group "Bake Settings" (
        checkbox chkBake         "Enable Bake (GI + Direct + Indirect)" checked:true
        checkbox chkSelectedOnly "Bake & Export Selected Only"          checked:false
        dropdownList ddBakeSize "Lightmap Resolution:" width:250 align:#left \
            items:#("512  - Fast Preview","1024 - Balanced (Recommended)","2048 - High Quality","4096 - Ultra") \
            selection:2
        button btnAnalyze "Analyze Scene" width:320 height:24 align:#center
        label lblAnalysis "Polys: --  |  Objects: --" align:#center
    )

    button btnExport "  Export & Upload (.glb)" width:330 height:48 align:#center \
        tooltip:"Bake GI using active renderer then export GLB"

    progressBar pbUpload width:330 height:12 align:#center value:0 color:(color 82 180 130)
    label lblStatus "Status: Ready." align:#center

    -- Show renderer on open
    on OB_ExporterRollout open do (
        local r = OB_detectRenderer()
        if r == "corona"      then lblRenderer.text = "Renderer: Corona  (CoronaBeauty — GI + Direct + Indirect + AO)"
        else if r == "vray"   then lblRenderer.text = "Renderer: V-Ray   (VRayCompleteMap — GI + Direct + Indirect)"
        else                       lblRenderer.text = "Renderer: Default (CompleteMap fallback)"
    )

    on btnAnalyze pressed do (
        local totalPolys = 0; local totalObjs = 0
        local src = if chkSelectedOnly.checked then selection else objects
        for obj in src do (
            totalObjs += 1
            if isProperty obj #faces     then totalPolys += obj.faces.count
            else if isProperty obj #mesh then totalPolys += obj.mesh.faces.count
        )
        lblAnalysis.text = "Polys: " + (totalPolys as string) + "  |  Objects: " + (totalObjs as string)
        if totalPolys > 1000000 then
            messageBox "Warning: Over 1 million triangles.\nBake will take a long time." title:"High Polygon Count"
    )

    fn UploadFile_OB filePath projectName authorId = (
        try (
            local baseUrl  = "http://localhost:3000/api/export"
            lblStatus.text = "Status: Uploading..."
            pbUpload.value = 90
            windows.processPostedMessages()
            local webClient = dotNetObject "System.Net.WebClient"
            local uriClass  = dotNetClass  "System.Uri"
            local finalUrl  = baseUrl + "?projectName=" + (uriClass.EscapeDataString projectName) \
                                      + "&authorId="    + (uriClass.EscapeDataString authorId)
            local respBytes = webClient.UploadFile finalUrl "POST" filePath
            local respText  = (dotNetClass "System.Text.Encoding").UTF8.GetString(respBytes)
            local key       = "\"viewerUrl\":\""
            local idx       = findString respText key
            local parsedUrl = ""
            if idx != undefined then (
                local tmp  = substring respText (idx + key.count) -1
                local eIdx = findString tmp "\""
                if eIdx != undefined then parsedUrl = substring tmp 1 (eIdx - 1)
            )
            pbUpload.value = 100
            lblStatus.text = "Status: Upload Successful!"
            if parsedUrl != "" then (
                if queryBox ("Upload Complete!\n\nLink:\n" + parsedUrl + "\n\nOpen in browser?") title:"Success | OB Exporter" then
                    ShellLaunch parsedUrl ""
            ) else (
                messageBox ("Upload Complete!\n\n" + respText) title:"Success"
            )
        ) catch (
            pbUpload.value = 0; lblStatus.text = "Status: Upload Failed!"
            messageBox ("Upload Error:\n" + getCurrentException()) title:"Upload Error"
        )
    )

    on btnExport pressed do (
        local projName     = txtProjectName.text
        local authId       = txtAuthorId.text
        local rendererType = OB_detectRenderer()

        if projName == "" then ( messageBox "Please enter a project name." title:"Validation"; return false )

        local src = if chkSelectedOnly.checked then selection else objects
        if src.count == 0 then ( messageBox "No objects to export!" title:"Export Error"; return false )

        local bakeSzMap = #(512, 1024, 2048, 4096)
        local bakeSz    = bakeSzMap[ddBakeSize.selection]

        -- Save original materials
        local originalMats = #()
        struct OB_MatData (obj, mat)
        for obj in src do (
            if isProperty obj #material and obj.material != undefined then
                append originalMats (OB_MatData obj:obj mat:obj.material)
        )

        -- Step 1: Convert materials
        lblStatus.text = "Status: Converting Materials..."; pbUpload.value = 5
        windows.processPostedMessages()
        runConvertAll_OB src
        lblStatus.text = "Status: " + (OB_convCount as string) + " materials converted."
        pbUpload.value = 15; windows.processPostedMessages()

        -- Step 2: Bake with GI
        if chkBake.checked then (
            local rLabel = case rendererType of (
                "corona":  "Corona (CoronaBeauty)"
                "vray":    "V-Ray (VRayCompleteMap)"
                default:   "Default (CompleteMap)"
            )
            lblStatus.text = "Status: Baking with " + rLabel + " at " + (bakeSz as string) + "px ..."
            pbUpload.value = 20; windows.processPostedMessages()

            local bakeDir = sysInfo.tempdir + "OB_bake\\"
            local bkCount = bakeSceneLighting_OB src bakeDir bakeSz rendererType

            lblStatus.text = "Status: Bake complete — " + (bkCount as string) + " objects baked."
            pbUpload.value = 70; windows.processPostedMessages()
        )

        -- Step 3: Export GLB
        lblStatus.text = "Status: Exporting GLB..."; pbUpload.value = 75
        windows.processPostedMessages()
        local exportPath = sysInfo.tempdir + projName + ".glb"
        if doesFileExist exportPath then deleteFile exportPath
        local exportOK = false
        try( exportOK = exportFile exportPath #noPrompt \
                selectedOnly:chkSelectedOnly.checked using:GLTFExport )catch( exportOK = false )

        -- Always restore original materials
        for data in originalMats do (
            if isValidNode data.obj then data.obj.material = data.mat )
        originalMats = #()

        -- Step 4: Upload
        if exportOK and doesFileExist exportPath then (
            lblStatus.text = "Status: Uploading..."; pbUpload.value = 85
            windows.processPostedMessages()
            UploadFile_OB exportPath projName authId
        ) else (
            pbUpload.value = 0; lblStatus.text = "Status: Export Failed!"
            messageBox "GLB export failed.\nMake sure GLTF Exporter is installed in 3ds Max." title:"Export Error"
        )
    )
)

createDialog OB_ExporterRollout

)
