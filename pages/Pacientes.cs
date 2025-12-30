using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
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
            if (string.IsNullOrWhiteSpace(txtBuscar.Text))
            {
                txtBuscar.Text = "Buscar por nombre, cédula o teléfono";
                txtBuscar.ForeColor = Color.Gray;
            }
        }

        private void label2_Click(object sender, EventArgs e)
        {

        }
    }
}
