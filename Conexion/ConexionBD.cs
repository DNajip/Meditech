using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace MediTech.Data
{
    public static class ConexionBD
    {
        private static string cadenaConexion =
            "Server=DESKTOP-DBQ0CJS\\SQLEXPRESS;Database=MediTech;User Id=sa;Password=123;";

        public static SqlConnection ObtenerConexion()
        {
            return new SqlConnection(cadenaConexion);
        }
    }
}
