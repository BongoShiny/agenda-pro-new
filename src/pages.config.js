import Agenda from './pages/Agenda';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import Administrador from './pages/Administrador';
import RelatoriosClientes from './pages/RelatoriosClientes';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import GerenciarPacotes from './pages/GerenciarPacotes';
import VenderPacotes from './pages/VenderPacotes';


export const PAGES = {
    "Agenda": Agenda,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "GerenciarUsuarios": GerenciarUsuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "ConfigurarUnidades": ConfigurarUnidades,
    "Administrador": Administrador,
    "RelatoriosClientes": RelatoriosClientes,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "GerenciarPacotes": GerenciarPacotes,
    "VenderPacotes": VenderPacotes,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};