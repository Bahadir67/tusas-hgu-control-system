using System;
using System.Collections.Generic;
using System.Linq;

namespace TUSAS.HGU.Core.Services.OPC
{
    /// <summary>
    /// OPC UA değişken koleksiyonu - DisplayName ile erişim
    /// </summary>
    public class OpcVariableCollection
    {
        private readonly Dictionary<string, OpcVariable> _variables;

        public OpcVariableCollection()
        {
            _variables = new Dictionary<string, OpcVariable>(StringComparer.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Koleksiyondaki toplam değişken sayısı
        /// </summary>
        public int Count => _variables.Count;

        /// <summary>
        /// Tüm değişken isimleri
        /// </summary>
        public IEnumerable<string> Names => _variables.Keys;

        /// <summary>
        /// Tüm değişkenler
        /// </summary>
        public IEnumerable<OpcVariable> Variables => _variables.Values;

        /// <summary>
        /// DisplayName ile değişken ekleme
        /// </summary>
        public void Add(OpcVariable variable)
        {
            if (variable == null || string.IsNullOrEmpty(variable.DisplayName))
                throw new ArgumentException("Variable and DisplayName cannot be null or empty");

            _variables[variable.DisplayName] = variable;
        }

        /// <summary>
        /// DisplayName ile değişken değeri sorgulama
        /// </summary>
        public OpcVariable? GetByName(string displayName)
        {
            if (string.IsNullOrEmpty(displayName))
                return null;

            return _variables.TryGetValue(displayName, out var variable) ? variable : null;
        }

        /// <summary>
        /// DisplayName ile değişken değeri alma (sadece value)
        /// </summary>
        public object? GetValue(string displayName)
        {
            var variable = GetByName(displayName);
            return variable?.Value;
        }

        /// <summary>
        /// DisplayName ile değişken değeri güncelleme
        /// </summary>
        public bool UpdateValue(string displayName, object? value)
        {
            var variable = GetByName(displayName);
            if (variable == null)
                return false;

            variable.Value = value;
            variable.LastUpdated = DateTime.Now;
            variable.IsValid = true;
            return true;
        }

        /// <summary>
        /// Tüm değişkenlerin değerlerini temizle
        /// </summary>
        public void ClearValues()
        {
            foreach (var variable in _variables.Values)
            {
                variable.Value = null;
                variable.IsValid = false;
            }
        }

        /// <summary>
        /// Geçerli (valid) değişken sayısı
        /// </summary>
        public int ValidCount => _variables.Values.Count(v => v.IsValid);

        public override string ToString()
        {
            return $"OpcVariableCollection: {Count} variables, {ValidCount} valid";
        }
    }
}