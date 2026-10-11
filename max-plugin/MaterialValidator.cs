using System;
using System.Collections.Generic;
using System.IO;

namespace ViewInteriorDesign.MaxPlugin
{
    public class MaterialValidationReport
    {
        public bool IsValid { get; set; } = true;
        public List<string> SupportedMaterials { get; set; } = new();
        public List<string> UnsupportedMaterials { get; set; } = new();
        public List<string> TxBitmapsFound { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    /// <summary>
    /// Validates scene materials before glTF export.
    /// Checks for VRayMtl, CoronaMtl, PhysicalMaterial, and proprietary .tx bitmap files.
    /// </summary>
    public static class MaterialValidator
    {
        private static readonly HashSet<string> RecognizedAutoConvertibleShaders = new(StringComparer.OrdinalIgnoreCase)
        {
            "VRayMtl",
            "CoronaMtl",
            "CoronaPhysicalMtl",
            "PhysicalMaterial",
            "Standardmaterial",
            "glTFMaterial"
        };

        /// <summary>
        /// Validates materials across the active 3ds Max scene or selection.
        /// In live 3ds Max runtime, uses Autodesk.Max API or MAXScript introspection.
        /// </summary>
        public static MaterialValidationReport ValidateSceneMaterials(IEnumerable<string> sceneMaterialClassNames, IEnumerable<string> bitmapPaths)
        {
            var report = new MaterialValidationReport();

            foreach (var materialClass in sceneMaterialClassNames)
            {
                if (RecognizedAutoConvertibleShaders.Contains(materialClass))
                {
                    report.SupportedMaterials.Add(materialClass);
                }
                else
                {
                    report.UnsupportedMaterials.Add(materialClass);
                    report.Warnings.Add($"Material shader '{materialClass}' may not convert cleanly to standard glTF PBR. Recommend baking lightmaps in 3ds Max.");
                }
            }

            foreach (var path in bitmapPaths)
            {
                if (Path.GetExtension(path).Equals(".tx", StringComparison.OrdinalIgnoreCase))
                {
                    report.TxBitmapsFound.Add(path);
                    report.Warnings.Add($"Proprietary texture format '{Path.GetFileName(path)}' detected. Convert .tx to .png or .jpg using V-RayMax Converter PRO for web compatibility.");
                }
            }

            if (report.UnsupportedMaterials.Count > 0 || report.TxBitmapsFound.Count > 0)
            {
                report.IsValid = false;
            }

            return report;
        }
    }
}
