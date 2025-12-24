import Administrador from './pages/Administrador';
import Agenda from './pages/Agenda';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import ConfiguracaoWhatsApp from './pages/ConfiguracaoWhatsApp';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import GerenciarProntuarios from './pages/GerenciarProntuarios';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import Home from './pages/Home';
import RelatoriosClientes from './pages/RelatoriosClientes';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import GerenciarContratos from './pages/GerenciarContratos';


export const PAGES = {
    "Administrador": Administrador,
    "Agenda": Agenda,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "ConfiguracaoWhatsApp": ConfiguracaoWhatsApp,
    "ConfigurarUnidades": ConfigurarUnidades,
    "GerenciarProntuarios": GerenciarProntuarios,
    "GerenciarUsuarios": GerenciarUsuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "Home": Home,
    "RelatoriosClientes": RelatoriosClientes,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "GerenciarContratos": GerenciarContratos,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};