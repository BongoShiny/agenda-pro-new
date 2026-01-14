import ConfiguracaoWhatsApp from './pages/ConfiguracaoWhatsApp';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import RelatoriosAvancados from './pages/RelatoriosAvancados';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import GerenciarContratos from './pages/GerenciarContratos';
import GerenciarProntuarios from './pages/GerenciarProntuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import Agenda from './pages/Agenda';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import RelatoriosClientes from './pages/RelatoriosClientes';
import Administrador from './pages/Administrador';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import Home from './pages/Home';


export const PAGES = {
    "ConfiguracaoWhatsApp": ConfiguracaoWhatsApp,
    "ConfigurarUnidades": ConfigurarUnidades,
    "RelatoriosAvancados": RelatoriosAvancados,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "GerenciarContratos": GerenciarContratos,
    "GerenciarProntuarios": GerenciarProntuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "Agenda": Agenda,
    "GerenciarUsuarios": GerenciarUsuarios,
    "RelatoriosClientes": RelatoriosClientes,
    "Administrador": Administrador,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};