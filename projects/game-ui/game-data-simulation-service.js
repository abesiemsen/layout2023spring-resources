class GameDataSimulation {

    options
    type = 'Abstract'
    score = 0
    startTime = 0
    elapsed = 0
    eventOptions = []
    inventory = []
    quests = []
    threats = []
    systems = []
    resources = []
    weightedEvents = []
    recentEvents = []

    constructor(options) {
        this.options = {
            loopFrequency: 100,
            ...options
        }
        this.populateInventory(options.inventoryOptions, options.inventoryCount)
        this.populateQuests(options.questOptions, options.questCount)
        this.populateThreats(options.threatOptions, options.threatCount)
    }

    populateInventory(names, count) {
        this.inventory = [...names].sort((a, b) => 0.5 - Math.random())
            .slice(0, count)
            .map(name => ({
                slug: this.slugify(name),
                name,
                count: Math.ceil(Math.random() * 20),
            }))
    }

    populateQuests(names, count) {
        this.quests = [...names].sort((a, b) => 0.5 - Math.random())
            .slice(0, count)
            .map(name => ({
                slug: this.slugify(name),
                name,
                distance: Math.random(),
                direction: Math.floor(Math.random() * 360),
                difficulty: ['easy', 'moderate', 'hard' ][Math.floor(Math.random()*3)],
            }))
        if (this.quests.length) {
            this.quests[0].current = true
        }
    }


    populateThreats(names, count) {
        this.threats = [...names].sort((a, b) => 0.5 - Math.random())
            .slice(0, count)
            .map(name => ({
                slug: this.slugify(name),
                name,
                distance: Math.random(),
                direction: Math.floor(Math.random() * 360),
                difficulty: ['easy', 'moderate', 'hard' ][Math.floor(Math.random()*3)],
            }))
    }

    start() {
        this.startTime = new Date().getTime()
    }

    getState() {
        this.elapsed = (new Date().getTime() - this.startTime) / 1000
        this.rechargeResources()
        if (this.options.eventsPerMinute) {
            const chanceOfevent = this.options.eventsPerMinute / 60 / 1000 * this.options.loopFrequency
            if ( Math.random() < chanceOfevent ) {
                this.triggerEvent()
            }
        }
        const { type, score, elapsed, resources, inventory, quests, threats, recentEvents } = this
        const simplifiedResources = resources
            .reduce((result, resource) => ({ ...result, [resource.name]: resource.value }), {})
        return { type, score, elapsed, recentEvents, resources: simplifiedResources, inventory, quests, threats,  }
    }

    rechargeResources() {
        this.resources
            .forEach(resource => {
                const systemsAvailable = (resource.requiredSystems || [])
                    .reduce((result, systemName) => result && this.systems.find(system => system.name == systemName).online, true )
                const amount = resource.rechargePerSecond / 1000 * this.options.loopFrequency
                resource.value = systemsAvailable ? Math.min(resource.max, resource.value + amount) : resource.empty
            })
    }

    useResource(name) {
        const resource = this.resourceByName(name)
        if (resource.value < resource.min) { return false }
        let decrement = resource.decrement
        if (!!resource.decrementMin && !!resource.decrementMax) {
            const range = resource.decrementMax - resource.decrementMin
            decrement = resource.decrementMin + (Math.random() * range)
        }
        const newValue = resource.value - decrement
        const aboveEmpty = newValue - resource.empty
        resource.value = Math.max(resource.value - decrement, resource.empty)
        return aboveEmpty
    }

    resourceByName(name) {
        return this.resources.find(resource => resource.name == name)
    }

    systemByName(name) {
        return this.systems.find(system => system.name == name)
    }

    triggerEvent() {
        const selectedEvent = this.weightedEvents[ Math.floor( Math.random() * this.weightedEvents.length ) ]
        const result = selectedEvent.action()
        if (result) {
            this.recentEvents = [
                selectedEvent.name,
                ...this.recentEvents,
            ].slice(0,5)
        }
    }

    slugify(str) {
        return str.replace(' ', '-').toLowerCase()
    }
}

class FantasyRPGSimulation extends GameDataSimulation {
    type = 'FantasyRPG'

    getState() {
        return {
            debuffs: [],
            ...super.getState()
        }
    }
}

class SpaceCombatSimulation extends GameDataSimulation {

    type = 'SpaceCombat'
    eventOptions = [
        // { name: 'firePhasers', weight: 5, action: () => this.firePhasers() },
        // { name: 'fireMissile', weight: 1, action: () => this.fireMissile() },
        { name: 'gotHit', weight: 1, action: () => this.gotHit() }
    ]
    systems = [
        { name: 'lifesupport', online: true },
        { name: 'thrusters', online: true },
        { name: 'shields', online: true },
        { name: 'phasers', online: true },
        { name: 'missiles', online: true },
        { name: 'sensors', online: true },
    ]
    resources = [
        { name: 'shields', value: 1, empty: 0, min: 0, max: 1, decrementMin: 0.1, decrementMax: 0.2, rechargePerSecond: 0.02, requiredSystems: ['shields']},
        { name: 'hull', value: 1, empty: 0, min: 0, max: 1, decrementMin: 0.1, decrementMax: 0.2, rechargePerSecond: 0, requiredSystems: []},
        { name: 'phasers', value: 1, empty: 0, min: 0.3, max: 1, decrement: 0.3, rechargePerSecond: 0.2, requiredSystems: ['phasers']},
        { name: 'missiles', value: 10, empty: 0, min: 0, max: 10, decrement: 1, rechargePerSecond: 0, requiredSystems: ['missiles']},
    ]
    

    constructor(options) {
        super(options)
        this.weightedEvents = this.eventOptions
            .reduce((result, event) => {
                for (let i=0; i < event.weight; i++) {
                    result.push({ ...event })
                }
                return result
            },[])
    }

    firePhasers() {
        return this.useResource('phasers')
    }

    fireMissile() {
        const result = this.useResource('missiles')
        const missiles = this.resourceByName('missiles')
        if (missiles.value == missiles.empty) {
            this.systemByName('missiles').online = false
        }
        return result
    }

    gotHit() {
        const aboveEmpty = this.useResource('shields')
        if (aboveEmpty < 0) {
            this.useResource('hull')
            if ( Math.random() < 2 ) {
                this.disableASystem()
            }
        }
        return true
    }

    disableASystem() {
        const sustem = this.systems[Math.floor(Math.random() * this.systems.length)]
        sustem.online = false
    }

    getState() {
        const { systemStatus } = this
        return {
            ...super.getState(),
            systemStatus: this.systems.reduce((result, system) => ({ ...result, [system.name]: system.online }), {}),
            gameOver: this.resourceByName('hull').value == 0
        }
    }
}

class Simulator {

    // This directive make it easy to toggle a class on the body element when an element is clicked.
    toggleBodyClassDirective = {
        mounted(el, binding) {
            const classTarget = document.body
            const className = binding.arg
            if ( !!classTarget && !!className ) {
                if ( binding.modifiers['on-by-default'] ) { classTarget.classList.add(className) }
                el.addEventListener( 'click', () => classTarget.classList.toggle(className) )
            }
        },
    }

    initialize(options) {
        let GameClass = GameDataSimulation
        if ( options.type.toLowerCase() == 'fantasyrpg') { GameClass = FantasyRPGSimulation }
        if ( options.type.toLowerCase() == 'spacecombat') { GameClass = SpaceCombatSimulation }
        return Vue.createApp({
            inject: [
                'GameInstance',
            ],
            mounted() {
                this.GameInstance.start()
                this.startLoop()
            },
            data: (ref) => ({
                loopInterval: undefined,
                game: ref.GameInstance.getState(),
            }),
            methods: {
                startLoop() {
                    this.loopInterval = setInterval(()=> {
                        this.game = this.GameInstance.getState()
                        if (this.game.gameOver) {
                            this.stopLoop()
                        }
                    }, this.GameInstance.options.loopFrequency)
                },
                stopLoop() {
                    clearInterval(this.loopInterval)
                },
                firePhasers() {
                    this.GameInstance.firePhasers()
                },
                fireMissile() {
                    this.GameInstance.fireMissile()
                }
            }
        })
            .provide('GameInstance', new GameClass(options))
            .directive('toggleBodyClass', this.toggleBodyClassDirective)
    }
}

