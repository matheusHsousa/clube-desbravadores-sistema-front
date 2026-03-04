import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { filter, take } from 'rxjs/operators';
import { UsersService } from 'src/app/services/users.service';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
    allUsers: any[] = [];
    desbravadores: any[] = [];
    instrutores: any[] = [];
    conselheiros: any[] = [];
    capelania: any[] = [];
    loading = false;

    // UI state
    editingUserId: number | null = null;
    editingDesbId: number | null = null;

    // id do usuário que acabou de ser salvo (para mostrar confirmação)
    saveSuccessUserId: number | null = null;

    // id do desbravador que acabou de ser salvo
    saveSuccessDesbId: number | null = null;

    // form models
    userForm: any = {};
    desbForm: any = {};

    desbravadoresPorUnidade: any[] = [];
    desbravadoresPorClasse: any[] = [];


    // enums for selects
    unidades = ['DA', 'ASER', 'MANASSES', 'JUDA', 'BENJAMIN', 'RUBEN'];
    classes = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];
    rolesOptions = ['CONSELHEIRO', 'INSTRUTOR', 'ADMIN', 'SECRETARIA', 'CAPELANIA'];

    // retornar abreviação curta para exibir em badges
    abbrRole(role: string) {
        if (!role) return '';
        const r = String(role).toUpperCase();
        switch (r) {
            case 'ADMIN':
                return 'ADM';
            case 'INSTRUTOR':
                return 'INST';
            case 'CONSELHEIRO':
                return 'CONS';
            case 'SECRETARIA':
                return 'SECRE';
            case 'CAPELANIA':
                return 'CPL';
            default:
                return r.length <= 4 ? r : r.slice(0, 4);
        }
    }

    constructor(
            private usersService: UsersService,
            private authService: AuthService,
            private desbravadoresService: DesbravadoresService,
            private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        // aguarda até termos o usuário do backend (com roles e token) antes de carregar os dados
        this.authService.currentUser$.pipe(
            filter(u => !!u),
            take(1)
        ).subscribe(() => this.loadAll());
    }

    private loadAll() {
        this.loading = true;

        // tenta carregar todos os endpoints; erros são tratados individualmente
        this.usersService.getAllUsers().subscribe(
            users => (this.allUsers = users),
            () => (this.allUsers = [])
        );

        this.usersService.getDesbravadores().subscribe(
            ds => {
                this.desbravadores = ds;
                this.buildDesbravadoresGroups(); // 🔥 ESSENCIAL
            },
            () => {
                this.desbravadores = [];
                this.desbravadoresPorUnidade = [];
                this.desbravadoresPorClasse = [];
            }
        );


        this.usersService.getInstrutores().subscribe(
            ins => (this.instrutores = ins),
            () => (this.instrutores = [])
        );

        this.usersService.getConselheiros().subscribe(
            cs => (this.conselheiros = cs),
            () => (this.conselheiros = [])
        );

        this.usersService.getCapelania().subscribe(
            cp => (this.capelania = cp),
            () => (this.capelania = [])
        );

        // pequeno timeout para esconder o loading quando as chamadas terminarem (UI simples)
        setTimeout(() => (this.loading = false), 600);
    }

    // Agrupa desbravadores por unidade para exibir em accordion
    get desbravadoresByUnidade() {
        const map: Record<string, any[]> = {};
        for (const d of this.desbravadores) {
            const key = d.unidade || 'Sem Unidade';
            if (!map[key]) map[key] = [];
            map[key].push(d);
        }
        return Object.keys(map).sort().map(k => ({ key: k, items: map[k] }));
    }

    // Agrupa instrutores por classe
    get instrutoresByClasse() {
        const map: Record<string, any[]> = {};
        for (const u of this.instrutores) {
            const key = u.classe || 'Sem Classe';
            if (!map[key]) map[key] = [];
            map[key].push(u);
        }
        return Object.keys(map).sort().map(k => ({ key: k, items: map[k] }));
    }

    // Agrupa desbravadores por classe (para a seção 'Classes')
    get desbravadoresByClasse() {
        const map: Record<string, any[]> = {};
        for (const d of this.desbravadores) {
            const key = d.classe || 'Sem Classe';
            if (!map[key]) map[key] = [];
            map[key].push(d);
        }
        return Object.keys(map).sort().map(k => ({ key: k, items: map[k] }));
    }

    toggleEditUser(u: any) {
        console.log('toggleEditUser clicked', u?.id);
        if (this.editingUserId === u.id) {
            this.editingUserId = null;
            this.userForm = {};
            return;
        }
        this.editingUserId = u.id;
        // clonar superficialmente e garantir que arrays (roles) sejam copiados para evitar mutação
        this.userForm = { ...u, roles: u.roles ? [...u.roles] : [] };
        // foco automático no input de nome após abrir o formulário
        setTimeout(() => {
            try {
                const el = document.getElementById(`input-name-${u.id}`) as HTMLInputElement | null;
                if (el) {
                    el.focus();
                    el.select?.();
                }
            } catch (e) {
                // silent
            }
        }, 50);
    }

    saveUser(u: any) {
        const payload: any = {
            name: this.userForm.name,
            roles: this.userForm.roles,
            unidade: this.userForm.unidade ?? null,
            classe: this.userForm.classe ?? null,
        };

        this.usersService.updateUser(u.id, payload).subscribe({
            next: (res) => {
                this.loadAll();
                this.editingUserId = null;
                // mostrar confirmação breve
                this.saveSuccessUserId = u.id;
                setTimeout(() => (this.saveSuccessUserId = null), 2000);
            },
            error: (err) => {
                console.error('Erro ao salvar usuário', err);
                this.snackBar.open('Erro ao salvar usuário', 'Fechar', { duration: 5000 });
            }
        });
    }

    onRoleChange(role: string, event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        this.userForm.roles = this.userForm.roles || [];
        if (checked) {
            if (!this.userForm.roles.includes(role)) this.userForm.roles.push(role);
        } else {
            this.userForm.roles = this.userForm.roles.filter((r: string) => r !== role);
            // se remover o cargo instrutor/conselheiro, limpar seleção correspondente
            if (role === 'INSTRUTOR') {
                this.userForm.classe = null;
            }
            if (role === 'CONSELHEIRO') {
                this.userForm.unidade = null;
            }
        }
    }

    trackById(_: number, item: any) {
        return item.id;
    }

    trackByKey(_: number, item: any) {
        return item.key;
    }

    buildDesbravadoresGroups() {
        const unidadeMap: Record<string, any[]> = {};
        const classeMap: Record<string, any[]> = {};

        for (const d of this.desbravadores) {
            const u = d.unidade || 'Sem Unidade';
            const c = d.classe || 'Sem Classe';

            (unidadeMap[u] ||= []).push(d);
            (classeMap[c] ||= []).push(d);
        }

        this.desbravadoresPorUnidade = Object.keys(unidadeMap)
            .sort()
            .map(k => ({ key: k, items: unidadeMap[k] }));

        this.desbravadoresPorClasse = Object.keys(classeMap)
            .sort()
            .map(k => ({ key: k, items: classeMap[k] }));
    }

    onDesbravadorUpdated() {
        this.buildDesbravadoresGroups();
    }


}