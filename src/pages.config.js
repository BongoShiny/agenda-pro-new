/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Administrador from './pages/Administrador';
import AnaliseCruzada from './pages/AnaliseCruzada';
import ConfiguracaoSabado from './pages/ConfiguracaoSabado';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import ConfigurarRecepcionistas from './pages/ConfigurarRecepcionistas';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import FormularioNPS from './pages/FormularioNPS';
import GerenciarClientesVendas from './pages/GerenciarClientesVendas';
import GerenciarContratos from './pages/GerenciarContratos';
import GerenciarProntuarios from './pages/GerenciarProntuarios';
import GerenciarServicos from './pages/GerenciarServicos';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import HistoricoClientes from './pages/HistoricoClientes';
import LancarVendas from './pages/LancarVendas';
import RankingVendedores from './pages/RankingVendedores';
import RelatorioErrosImportacao from './pages/RelatorioErrosImportacao';
import RelatoriosAvancados from './pages/RelatoriosAvancados';
import RelatoriosCRM from './pages/RelatoriosCRM';
import RelatoriosClientes from './pages/RelatoriosClientes';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import WhatsAppCompleto from './pages/WhatsAppCompleto';
import Home from './pages/Home';
import Agenda from './pages/Agenda';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Administrador": Administrador,
    "AnaliseCruzada": AnaliseCruzada,
    "ConfiguracaoSabado": ConfiguracaoSabado,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "ConfigurarRecepcionistas": ConfigurarRecepcionistas,
    "ConfigurarUnidades": ConfigurarUnidades,
    "FormularioNPS": FormularioNPS,
    "GerenciarClientesVendas": GerenciarClientesVendas,
    "GerenciarContratos": GerenciarContratos,
    "GerenciarProntuarios": GerenciarProntuarios,
    "GerenciarServicos": GerenciarServicos,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "HistoricoClientes": HistoricoClientes,
    "LancarVendas": LancarVendas,
    "RankingVendedores": RankingVendedores,
    "RelatorioErrosImportacao": RelatorioErrosImportacao,
    "RelatoriosAvancados": RelatoriosAvancados,
    "RelatoriosCRM": RelatoriosCRM,
    "RelatoriosClientes": RelatoriosClientes,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "WhatsAppCompleto": WhatsAppCompleto,
    "Home": Home,
    "Agenda": Agenda,
    "GerenciarUsuarios": GerenciarUsuarios,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};