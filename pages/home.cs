using MediTech._0._2.pages;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace MediTech._0._2

{
    public partial class home : Form
    {
        public home() {
            InitializeComponent();
        }
        public home( int idUsuario, string rol)
        {
            InitializeComponent();
        }

        private void home_Load(object sender, EventArgs e)
        {

        }
        private void AbrirFormulario(Form formulario)
        {
            //Este metodo sera el corazon de la navegacion
            panelcontenedor.Controls.Clear();

            formulario.TopLevel = false;
            formulario.FormBorderStyle = FormBorderStyle.None;
            formulario.Dock = DockStyle.Fill;
            panelcontenedor.Controls.Add(formulario);
            formulario.Show();
        }
        private void button2_Click(object sender, EventArgs e)
        {
            this.Close();
            Login loginForm = new Login();
        }

        private void label1_Click(object sender, EventArgs e)
        {

        }

        private void btnDashboard_Click(object sender, EventArgs e)
        {
            AbrirFormulario(new DashboardAdmin());

        }

        private void btnCitas_Click(object sender, EventArgs e)
        {
            AbrirFormulario(new Citas());
        }

        private void btnPacientes_Click(object sender, EventArgs e)
        {
            AbrirFormulario(new Pacientes());
        }

        private void home_Shown(object sender, EventArgs e)
        {
            AbrirFormulario(new DashboardAdmin());
        }

        private void btnHistorial_Click(object sender, EventArgs e)
        {

        }

        private void btnTratamientos_Click(object sender, EventArgs e)
        {

        }

        private void btnConsentimientos_Click(object sender, EventArgs e)
        {

        }

        private void btnReportes_Click(object sender, EventArgs e)
        {

        }

        private void btnCaja_Click(object sender, EventArgs e)
        {

        }

        private void btnUsuarios_Click(object sender, EventArgs e)
        {

        }
    }
}
