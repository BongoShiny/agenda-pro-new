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
import AcessoNegado from './pages/AcessoNegado';
import Administrador from './pages/Administrador';
import Agenda from './pages/Agenda';
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
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import HistoricoClientes from './pages/HistoricoClientes';
import Home from './pages/Home';
import LancarVendas from './pages/LancarVendas';
import RankingVendedores from './pages/RankingVendedores';
import Registro from './pages/Registro';
import RelatorioErrosImportacao from './pages/RelatorioErrosImportacao';
import RelatoriosAvancados from './pages/RelatoriosAvancados';
import RelatoriosCRM from './pages/RelatoriosCRM';
import RelatoriosClientes from './pages/RelatoriosClientes';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import WhatsAppCompleto from './pages/WhatsAppCompleto';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AcessoNegado": AcessoNegado,
    "Administrador": Administrador,
    "Agenda": Agenda,
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
    "GerenciarUsuarios": GerenciarUsuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "HistoricoClientes": HistoricoClientes,
    "Home": Home,
    "LancarVendas": LancarVendas,
    "RankingVendedores": RankingVendedores,
    "Registro": Registro,
    "RelatorioErrosImportacao": RelatorioErrosImportacao,
    "RelatoriosAvancados": RelatoriosAvancados,
    "RelatoriosCRM": RelatoriosCRM,
    "RelatoriosClientes": RelatoriosClientes,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "WhatsAppCompleto": WhatsAppCompleto,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};