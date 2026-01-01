using MediTech.Data;
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

namespace MediTech._0._2.pages
{
    public partial class Pacientes : Form
    {
        public Pacientes()
        {
            InitializeComponent();

            //CARGAR PACIENTES A DATAGRIDVIEW
            CargarPacientes();
        }

        private void label1_Click(object sender, EventArgs e)
        {

        }

        private void button3_Click(object sender, EventArgs e)
        {

        }

        private void Pacientes_Load(object sender, EventArgs e)
        {
            //  Inicializar los placeholders al iniciar el formulario
            txtBuscar.Text = PH_BUSCAR;          // "txtbuscar"
            txtBuscar.ForeColor = Color.Gray;
        }


        private const string PH_BUSCAR = "Buscar por nombre, cédula o teléfono";
        private void txtBuscar_Enter(object sender, EventArgs e)
        {
            // Vereeficamos que el txt tiene las instrucciones y se borre
            if (txtBuscar.Text == "Buscar por nombre, cédula o teléfono")
            {
                txtBuscar.Text = "";
                txtBuscar.ForeColor = Color.Black;
            }
        }

        private void txtBuscar_Leave(object sender, EventArgs e)
        {

            // Palbras en el texbox
            if (string.IsNullOrWhiteSpace(txtBuscar.Text))
            {
                txtBuscar.Text = "Buscar por nombre, cédula o teléfono";
                txtBuscar.ForeColor = Color.Gray;
            }
        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        private void button2_Click(object sender, EventArgs e)
        {
            NuevoPacientecs agregar = new NuevoPacientecs();
            agregar.ShowDialog();
        }

        //Creacion de metodos
        private void CargarPacientes()
        {
            // Codigo para cargar los pacientes en el DataGridView
            try
            {
                using (SqlConnection conexion = ConexionBD.ObtenerConexion())
                {
                    using (SqlCommand cmd = new SqlCommand("sp_paciente_listar", conexion))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;

                        SqlDataAdapter adapter = new SqlDataAdapter(cmd);
                        DataTable tablaPacientes = new DataTable();
                        adapter.Fill(tablaPacientes);

                        dgvPacientes.DataSource = tablaPacientes;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al cargar los pacientes: " + ex.Message);
            }


            // Editar encabezados del DataGridView
            if (dgvPacientes.Columns.Count == 0) return;

            // Ocultar columnas técnicas
            if (dgvPacientes.Columns.Contains("id_paciente"))
                dgvPacientes.Columns["id_paciente"].Visible = false;

            if (dgvPacientes.Columns.Contains("estado"))
                dgvPacientes.Columns["estado"].Visible = false;

            // Encabezados claros
            dgvPacientes.Columns["primer_nombre"].HeaderText = "Primer Nombre";
            dgvPacientes.Columns["segundo_nombre"].HeaderText = "Segundo Nombre";
            dgvPacientes.Columns["primer_apellido"].HeaderText = "Primer Apellido";
            dgvPacientes.Columns["segundo_apellido"].HeaderText = "Segundo Apellido";
            dgvPacientes.Columns["tipo_identificacion"].HeaderText = "Tipo ID";
            dgvPacientes.Columns["numero_identificacion"].HeaderText = "Identificación";
            dgvPacientes.Columns["sexo"].HeaderText = "Sexo";
            dgvPacientes.Columns["fecha_nacimiento"].HeaderText = "Fecha de Nacimiento";
            dgvPacientes.Columns["telefono"].HeaderText = "Teléfono";
            dgvPacientes.Columns["ocupacion"].HeaderText = "Ocupación";
            dgvPacientes.Columns["direccion"].HeaderText = "Dirección";
            dgvPacientes.Columns["fecha_registro"].HeaderText = "Fecha de Registro";

            // Orden visual
            dgvPacientes.Columns["primer_nombre"].DisplayIndex = 0;
            dgvPacientes.Columns["segundo_nombre"].DisplayIndex = 1;
            dgvPacientes.Columns["primer_apellido"].DisplayIndex = 2;
            dgvPacientes.Columns["segundo_apellido"].DisplayIndex = 3;
            dgvPacientes.Columns["tipo_identificacion"].DisplayIndex = 4;
            dgvPacientes.Columns["numero_identificacion"].DisplayIndex = 5;
            dgvPacientes.Columns["sexo"].DisplayIndex = 6;
            dgvPacientes.Columns["fecha_nacimiento"].DisplayIndex = 7;
            dgvPacientes.Columns["telefono"].DisplayIndex = 8;
            dgvPacientes.Columns["ocupacion"].DisplayIndex = 9;
            dgvPacientes.Columns["direccion"].DisplayIndex = 10;
            dgvPacientes.Columns["fecha_registro"].DisplayIndex = 11;


        }
        }
    }
