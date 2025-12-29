using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Data.SqlClient;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using MediTech.Data;

namespace MediTech._0._2
{
    public partial class Login : Form
    {
        public Login()
        {
            InitializeComponent();

        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        private void Form1_Load(object sender, EventArgs e)
        {


            //  Inicializar los placeholders al iniciar el formulario
            txtUsuario.Text = PH_USUARIO;          // "Ingrese su cédula"
            txtUsuario.ForeColor = Color.Gray;

            txtPassword.Text = PH_PASSWORD;        // "Ingrese su contraseña"
            txtPassword.ForeColor = Color.Gray;
            txtPassword.PasswordChar = '\0';       // Mostrar texto


        }


        private void txtUsuario_Enter(object sender, EventArgs e)
        {
       
            // Vereeficamos que el txt tiene las instrucciones y se borre
            if (txtUsuario.Text == "Ingrese su cedúla")
            {
                txtUsuario.Text = "";
                txtUsuario.ForeColor = Color.Black;
            }
        }
        private void txtUsuario_Leave(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(txtUsuario.Text))
            {
                txtUsuario.Text = "Ingrese su cedúla";
                txtUsuario.ForeColor = Color.Gray;
            }
        }

        private void txtPassword_Enter(object sender, EventArgs e)
        {
            // Vereeficamos que el txt tiene las instrucciones y se borre
            if (txtPassword.Text == "Ingrese su contraseña")
            {
                txtPassword.Text = ("");
                txtPassword.ForeColor = Color.Black;
            }
        }

        private void txtPassword_Leave(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(txtPassword.Text))
            {
                txtPassword.Text = "Ingrese su contraseña";
                txtPassword.ForeColor = Color.Gray;
            }
        }
        private const string PH_USUARIO = "Ingrese su cedúla";
        private const string PH_PASSWORD = "Ingrese su contraseña";

        private bool CampoVacio(TextBox txt)
        {
            return txt.ForeColor == Color.Gray || string.IsNullOrWhiteSpace(txt.Text);
        }



        private void button2_Click(object sender, EventArgs e)
        {
            this.Close();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            // =========================
            // 1. VALIDACIONES DE UI
            // =========================

            bool usuarioVacio = CampoVacio(txtUsuario);
            bool passwordVacio = CampoVacio(txtPassword);
            // 1. Ambos vacíos
            if (usuarioVacio && passwordVacio)
            {
                MessageBox.Show(
                    "Rellene los campos vacíos.",
                    "Validación",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                txtUsuario.Focus();
                return;
            }

            // 2. Usuario lleno, contraseña vacía
            if (!usuarioVacio && passwordVacio)
            {
                MessageBox.Show(
                    "Rellene el campo de contraseña.",
                    "Validación",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                txtPassword.Focus();
                return;
            }

            // 3. Contraseña llena, usuario vacío
            if (usuarioVacio && !passwordVacio)
            {
                MessageBox.Show(
                    "Ingrese su cédula.",
                    "Validación",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                txtUsuario.Focus();
                return;
            }

            // 👉 SI LLEGA AQUÍ, LOS CAMPOS ESTÁN CORRECTOS
            // 👉 AHORA SÍ se puede tocar la BD

            // =========================
            // 2. CONEXIÓN Y LOGIN
            // =========================

            try
            {
                using (SqlConnection conexion = ConexionBD.ObtenerConexion())
                using (SqlCommand cmd = new SqlCommand("sp_login_usuario", conexion))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@cedula", txtUsuario.Text.Trim());
                    cmd.Parameters.AddWithValue("@password", txtPassword.Text.Trim());

                    conexion.Open();

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            int resultado = Convert.ToInt32(reader["resultado"]);

                            switch (resultado)
                            {
                                case -1:
                                    MessageBox.Show("El usuario no existe.", "Error");
                                    return;

                                case -2:
                                    MessageBox.Show("Este usuario está inactivo.", "Usuario inactivo");
                                    return;

                                case -3:
                                    MessageBox.Show("Contraseña incorrecta.", "Error");
                                    return;

                                case 1:
                                    int idUsuario = Convert.ToInt32(reader["id_usuario"]);
                                    string nombre = reader["nombre"].ToString();
                                    string rol = reader["tipo_rol"].ToString();

                                    MessageBox.Show($"Bienvenido {nombre}", "Acceso concedido");

                                    this.Hide();
                                    home frm = new home(idUsuario, rol);
                                    frm.Show();
                                    break;

                        

                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error de conexión con la base de datos:\n" + ex.Message,
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
